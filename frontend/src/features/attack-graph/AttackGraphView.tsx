import React, { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
} from '@xyflow/react';
import {
  Search,
  Download,
  X,
  CheckCircle,
  XCircle,
  HelpCircle,
  AlertOctagon,
  ArrowRight
} from 'lucide-react';
import { CTINode } from './CTINode';
import { CTIEdge } from './CTIEdge';
import {
  AttackGraphResponse,
  AttackGraphNodeData,
  AttackGraphEdgeData,
} from '../../types';

const nodeTypes = { ctiNode: CTINode };
const edgeTypes = { ctiEdge: CTIEdge };

interface AttackGraphViewProps {
  graphData: AttackGraphResponse | null;
  isLoading: boolean;
  onUpdateRelationship?: (
    relId: string,
    status: 'unreviewed' | 'confirmed' | 'rejected' | 'uncertain'
  ) => void;
}

export const AttackGraphView: React.FC<AttackGraphViewProps> = ({
  graphData,
  isLoading,
  onUpdateRelationship,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL');

  const [selectedNode, setSelectedNode] = useState<AttackGraphNodeData | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<AttackGraphEdgeData | null>(null);

  // Initial nodes & edges from backend graph data
  const initialNodes: Node[] = useMemo(() => {
    if (!graphData?.nodes) return [];
    return graphData.nodes.map((n) => ({
      id: n.id,
      type: 'ctiNode',
      position: n.position,
      data: n.data,
    }));
  }, [graphData]);

  const initialEdges: Edge[] = useMemo(() => {
    if (!graphData?.edges) return [];
    return graphData.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: 'ctiEdge',
      animated: e.animated,
      data: e.data,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: e.data.classification === 'inferred' ? '#d97706' : '#94a3b8',
      },
    }));
  }, [graphData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Synchronize when graphData updates
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Filtering & Search
  const filteredNodes = useMemo(() => {
    return nodes.map((node) => {
      const data = node.data as unknown as AttackGraphNodeData;
      const matchesSearch =
        !searchQuery ||
        data.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        data.entity_type?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        selectedTypeFilter === 'ALL' || data.entity_type === selectedTypeFilter;
      const matchesStage =
        selectedStageFilter === 'ALL' || data.stage === selectedStageFilter;

      const isVisible = matchesSearch && matchesType && matchesStage;

      return {
        ...node,
        style: {
          opacity: isVisible ? 1 : 0.15,
          pointerEvents: isVisible ? ('auto' as const) : ('none' as const),
        },
      };
    });
  }, [nodes, searchQuery, selectedTypeFilter, selectedStageFilter]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data as unknown as AttackGraphNodeData);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge.data as unknown as AttackGraphEdgeData);
    setSelectedNode(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // Distinct entity types & stages for filters
  const entityTypes = useMemo(() => {
    if (!graphData?.nodes) return [];
    return Array.from(new Set(graphData.nodes.map((n) => n.data.entity_type))).sort();
  }, [graphData]);

  const stages = useMemo(() => {
    if (!graphData?.stages) return [];
    return graphData.stages;
  }, [graphData]);

  // Export handlers
  const handleExportJSON = () => {
    if (!graphData) return;
    const blob = new Blob([JSON.stringify(graphData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attack_graph_${graphData.report_id || 'recon'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSVG = () => {
    const svgElem = document.querySelector('.react-flow__viewport');
    if (!svgElem) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElem);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attack_graph_${graphData?.report_id || 'recon'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium">Synthesizing Attack Graph Lineage...</p>
      </div>
    );
  }

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-500 p-8">
        <AlertOctagon className="w-16 h-16 text-slate-400 mb-4" />
        <h3 className="text-base font-bold text-slate-800 mb-2">No Attack Chain Reconstructed</h3>
        <p className="text-xs text-slate-500 max-w-md text-center mb-6 leading-relaxed">
          Upload a CTI report or select one of the built-in synthetic scenarios, then click "Analyze Report" to reconstruct the interactive attack graph.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
      {/* Top Controls & Metrics Bar */}
      <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 z-10 shrink-0 shadow-xs">
        {/* Search & Filters */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search entities or types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-52 shadow-xs"
            />
          </div>

          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
          >
            <option value="ALL">All Entity Types</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
          >
            <option value="ALL">All Attack Stages</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Graph Topological Metrics & Exports */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Nodes: <strong className="text-blue-600 font-bold">{graphData.nodes.length}</strong>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Edges: <strong className="text-teal-600 font-bold">{graphData.edges.length}</strong>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Components: <strong className="text-purple-600 font-bold">{graphData.connected_components_count}</strong>
            </span>
            {graphData.detected_cycles_count > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Cycles: <strong>{graphData.detected_cycles_count}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportSVG}
              className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-blue-600 hover:border-blue-400 transition shadow-xs"
              title="Export as SVG"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:text-blue-600 hover:border-blue-400 transition shadow-xs"
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive React Flow Area */}
      <div className="flex-1 w-full h-full relative bg-slate-50/50">
        <ReactFlow
          nodes={filteredNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          fitView
          minZoom={0.2}
          maxZoom={2.5}
          attributionPosition="bottom-left"
        >
          <Background color="#cbd5e1" gap={24} size={1} />
          <Controls position="bottom-left" />
          <MiniMap
            nodeColor={(n) => (n.data as unknown as AttackGraphNodeData).color || '#2563eb'}
            maskColor="rgba(241, 245, 249, 0.7)"
            position="bottom-right"
          />
        </ReactFlow>

        {/* Node Details Inspection Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-96 max-h-[calc(100%-2rem)] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl p-5 z-50 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedNode.color }}
                />
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Entity Intelligence
                </h4>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Entity Name</span>
                <p className="font-mono text-sm text-blue-600 font-bold break-all mt-0.5">
                  {selectedNode.full_name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Type</span>
                  <span className="font-mono text-slate-800 font-semibold">
                    {selectedNode.entity_type}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Attack Stage</span>
                  <span className="font-mono text-teal-700 font-semibold">
                    {selectedNode.stage}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500 uppercase font-medium">Extraction Confidence</span>
                  <span className="font-mono text-blue-600 font-bold">
                    {Math.round(selectedNode.confidence * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${selectedNode.confidence * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">
                  Supporting Evidence Sentence
                </span>
                <div className="mt-1 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 italic leading-relaxed text-[11px]">
                  "{selectedNode.evidence || 'Extracted from document telemetry.'}"
                </div>
              </div>

              <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-3 flex justify-between">
                <span>Paragraph #{selectedNode.paragraph_index + 1}</span>
                <span className="font-medium">{selectedNode.extraction_method}</span>
              </div>
            </div>
          </div>
        )}

        {/* Edge Details Inspection Drawer */}
        {selectedEdge && (
          <div className="absolute top-4 right-4 w-96 bg-white border border-slate-200 rounded-xl shadow-2xl p-5 z-50 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Relationship Intelligence
              </h4>
              <button
                onClick={() => setSelectedEdge(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="max-w-[120px] truncate text-slate-800 font-mono font-medium">
                  {selectedEdge.source_name}
                </div>
                <div className="flex flex-col items-center">
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                  <span className="text-[9px] uppercase font-bold text-blue-600">
                    {selectedEdge.relationship_type}
                  </span>
                </div>
                <div className="max-w-[120px] truncate text-slate-800 font-mono font-medium">
                  {selectedEdge.target_name}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Classification</span>
                  <span
                    className={`font-mono font-semibold ${
                      selectedEdge.classification === 'observed'
                        ? 'text-teal-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {selectedEdge.classification}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Validation</span>
                  <span className="font-mono text-slate-800 font-semibold capitalize">
                    {selectedEdge.validation_status}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">
                  Supporting Evidence Sentence
                </span>
                <div className="mt-1 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 italic leading-relaxed text-[11px]">
                  "{selectedEdge.evidence || 'Contextual telemetry correlation.'}"
                </div>
              </div>

              {/* Analyst Validation Controls */}
              {onUpdateRelationship && (
                <div className="border-t border-slate-200 pt-3">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-2">
                    Analyst Validation Action
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() =>
                        onUpdateRelationship(selectedEdge.id, 'confirmed')
                      }
                      className="flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Confirm</span>
                    </button>
                    <button
                      onClick={() =>
                        onUpdateRelationship(selectedEdge.id, 'uncertain')
                      }
                      className="flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-semibold transition"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Uncertain</span>
                    </button>
                    <button
                      onClick={() =>
                        onUpdateRelationship(selectedEdge.id, 'rejected')
                      }
                      className="flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
