import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Search,
  X,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Download,
  Layers,
  ExternalLink,
  Tag,
  ChevronRight,
} from 'lucide-react';
import { CTINode } from './CTINode';
import { CTIEdge } from './CTIEdge';
import { getLayoutedElements } from './dagreLayout';
import { STAGES, getStage, getEntityStyle } from './graphMeta';
import { generateGraphSvg, downloadSvgFile, downloadPngFromSvg } from './graphExporter';
import {
  AttackGraphResponse,
  AttackGraphNodeData,
  AttackGraphEdgeData,
  ReportItem,
} from '../../types';

const nodeTypes = { ctiNode: CTINode };
const edgeTypes = { ctiEdge: CTIEdge };

interface AttackChainDashboardProps {
  currentReport: ReportItem | null;
  graphData: AttackGraphResponse | null;
  isLoading: boolean;
  onNavigateToDetails: () => void;
  onNavigateToUpload: () => void;
}

const GraphCanvasInner: React.FC<AttackChainDashboardProps> = ({
  currentReport,
  graphData,
  isLoading,
  onNavigateToDetails,
  onNavigateToUpload,
}) => {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedNode, setSelectedNode] = useState<AttackGraphNodeData | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<AttackGraphEdgeData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [showLabels, setShowLabels] = useState(true);

  // Raw nodes from API
  const rawNodes: Node[] = useMemo(() => {
    if (!graphData?.nodes) return [];
    return graphData.nodes.map((n) => ({
      id: n.id,
      type: 'ctiNode',
      position: n.position || { x: 0, y: 0 },
      data: n.data,
    }));
  }, [graphData]);

  // Raw edges from API with directional arrow configuration
  const rawEdges: Edge[] = useMemo(() => {
    if (!graphData?.edges) return [];
    return graphData.edges.map((e) => {
      const isInferred = e.data?.classification === 'inferred';
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        type: 'ctiEdge',
        animated: isInferred,
        data: e.data,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: isInferred ? '#F59E0B' : '#22D3EE',
        },
      };
    });
  }, [graphData]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Apply Dagre Top-to-Bottom vertical layout on data update or reset
  const applyDagreLayout = useCallback(() => {
    if (rawNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const layouted = getLayoutedElements(rawNodes, rawEdges, 'LR');
    setNodes(layouted.nodes);
    setEdges(layouted.edges);

    // Initial fit view with comfortable padding for vertical flow
    setTimeout(() => {
      fitView({ padding: 0.12, duration: 450 });
    }, 60);
  }, [rawNodes, rawEdges, setNodes, setEdges, fitView]);

  useEffect(() => {
    applyDagreLayout();
  }, [applyDagreLayout]);

  // Distinct entity categories for filtering
  const categories = useMemo(() => {
    const set = new Set<string>();
    rawNodes.forEach((n) => {
      const d = n.data as unknown as AttackGraphNodeData;
      if (d?.entity_type) set.add(d.entity_type);
    });
    return Array.from(set).sort();
  }, [rawNodes]);

  // Count of entities per kill-chain stage (drives the stage ribbon)
  const stageCounts = useMemo(() => {
    const m = new Map<string, number>();
    rawNodes.forEach((n) => {
      const st = getStage((n.data as unknown as AttackGraphNodeData)?.stage).key;
      m.set(st, (m.get(st) ?? 0) + 1);
    });
    return m;
  }, [rawNodes]);

  const matchFn = useCallback(
    (data: AttackGraphNodeData) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        data?.label?.toLowerCase().includes(q) ||
        data?.full_name?.toLowerCase().includes(q) ||
        data?.entity_type?.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'ALL' || data?.entity_type === selectedCategory;
      const matchesStage = selectedStage === 'ALL' || getStage(data?.stage).key === selectedStage;
      return Boolean(matchesSearch && matchesCat && matchesStage);
    },
    [searchQuery, selectedCategory, selectedStage]
  );

  const filtering = searchQuery !== '' || selectedCategory !== 'ALL' || selectedStage !== 'ALL';

  const displayNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        style: {
          opacity: matchFn(node.data as unknown as AttackGraphNodeData) ? 1 : 0.18,
          transition: 'opacity 0.25s ease',
        },
      })),
    [nodes, matchFn]
  );

  const displayEdges = useMemo(() => {
    const ok = new Set(
      nodes.filter((n) => matchFn(n.data as unknown as AttackGraphNodeData)).map((n) => n.id)
    );
    return edges.map((e) => ({
      ...e,
      data: {
        ...(e.data as object),
        showLabel: showLabels,
        dim: filtering && !(ok.has(e.source) && ok.has(e.target)),
      },
    }));
  }, [edges, nodes, matchFn, filtering, showLabels]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data as unknown as AttackGraphNodeData);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge.data as unknown as AttackGraphEdgeData);
    setSelectedNode(null);
  }, []);

  const handleExportSvg = () => {
    const svgStr = generateGraphSvg(nodes, edges);
    downloadSvgFile(svgStr, `attack_chain_${currentReport?.original_filename || 'graph'}.svg`);
  };

  const handleExportPng = async () => {
    setIsExporting(true);
    try {
      const svgStr = generateGraphSvg(nodes, edges);
      await downloadPngFromSvg(svgStr, `attack_chain_${currentReport?.original_filename || 'graph'}.png`);
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] min-h-[720px] bg-transparent relative overflow-hidden">
      {/* Compact Top Controls Toolbar */}
      <div className="bg-[#00191B]/95 backdrop-blur-md border-b border-[#12494D] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20 shadow-md">
        {/* Left: Report info & back */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onNavigateToUpload}
            className="px-2.5 py-1.5 text-xs font-semibold text-[#E6FFFF] hover:text-[#00E5F0] bg-[#002629] hover:bg-[#00353A] rounded-lg border border-[#12494D] hover:border-[#087F88] flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#00C9D4]" />
            Upload
          </button>
          <div className="h-4 w-px bg-[#12494D]" />
          <div className="truncate max-w-[200px] sm:max-w-xs md:max-w-sm">
            <span className="text-[10px] font-semibold text-[#548286] uppercase tracking-wider block leading-none">
              Active Investigation
            </span>
            <span className="text-xs font-bold text-[#E6FFFF] truncate block mt-0.5" title={currentReport?.original_filename}>
              {currentReport?.original_filename || 'No report selected'}
            </span>
          </div>
          {rawNodes.length > 0 && (
            <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#002629] text-[#00E5F0] border border-[#087F88]">
              {rawNodes.length} Nodes • {rawEdges.length} Links
            </span>
          )}
        </div>

        {/* Center: Search & Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-sm sm:max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#548286] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search entities, IPs, commands, files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-[#001B1D] border border-[#12494D] rounded-lg text-xs text-[#E6FFFF] placeholder-[#548286] focus:outline-none focus:ring-2 focus:ring-[#00C9D4]/20 focus:border-[#00C9D4]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#548286] hover:text-[#E6FFFF]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-[#001B1D] border border-[#12494D] rounded-lg text-xs text-[#E6FFFF] font-medium focus:outline-none focus:ring-2 focus:ring-[#00C9D4]/20 cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Zoom controls, Reset Layout, Quick Export, and Primary "View Attack Details" button */}
        <div className="flex items-center gap-2">
          {/* Zoom & Fit Toolbar */}
          <div className="flex items-center rounded-lg border border-[#12494D] bg-[#001B1D] overflow-hidden shadow-xs">
            <button
              onClick={() => zoomIn({ duration: 200 })}
              title="Zoom In"
              className="p-1.5 hover:bg-[#002629] text-[#9CBFC2] hover:text-[#00E5F0] border-r border-[#12494D]"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => zoomOut({ duration: 200 })}
              title="Zoom Out"
              className="p-1.5 hover:bg-[#002629] text-[#9CBFC2] hover:text-[#00E5F0] border-r border-[#12494D]"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => fitView({ padding: 0.16, duration: 300 })}
              title="Fit to Screen"
              className="p-1.5 hover:bg-[#002629] text-[#9CBFC2] hover:text-[#00E5F0] border-r border-[#12494D]"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={applyDagreLayout}
              title="Reset Vertical Attack Chain Layout"
              className="px-2 py-1.5 hover:bg-[#002629] text-[#E6FFFF] hover:text-[#00E5F0] font-semibold text-xs flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 text-[#00C9D4]" />
              Reset Layout
            </button>
          </div>

          <button
            onClick={() => setShowLabels((v) => !v)}
            title="Toggle relationship labels"
            className={`px-2 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
              showLabels
                ? 'bg-[#00353A] border-[#22D3EE] text-[#22D3EE]'
                : 'bg-[#001B1D] border-[#12494D] text-[#9CBFC2]'
            }`}
          >
            <Tag className="w-3 h-3" /> Labels
          </button>

          {/* Quick Export SVG/PNG */}
          <div className="hidden sm:flex items-center rounded-lg border border-[#12494D] bg-[#001B1D] overflow-hidden shadow-xs">
            <button
              onClick={handleExportSvg}
              title="Download vector SVG"
              className="px-2 py-1.5 text-xs font-semibold text-[#9CBFC2] hover:bg-[#002629] hover:text-[#00E5F0] border-r border-[#12494D] flex items-center gap-1"
            >
              <Download className="w-3 h-3 text-[#087F88]" />
              SVG
            </button>
            <button
              onClick={handleExportPng}
              disabled={isExporting}
              title="Download raster PNG"
              className="px-2 py-1.5 text-xs font-semibold text-[#9CBFC2] hover:bg-[#002629] hover:text-[#00E5F0] flex items-center gap-1"
            >
              <Download className="w-3 h-3 text-[#087F88]" />
              PNG
            </button>
          </div>

          {/* Primary Action Button: View Attack Details (takes user to Dashboard 3) */}
          <button
            onClick={onNavigateToDetails}
            className="px-3.5 py-1.5 bg-[#00C9D4] hover:bg-[#00E5F0] text-[#001314] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#00C9D4]/20 transition-all hover:shadow-[0_0_16px_rgba(0,229,240,0.4)] cursor-pointer"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Kill-chain ribbon: one logo per attack stage, click to filter */}
      <div className="shrink-0 z-10 bg-[#00141600] px-4 py-2 border-b border-[#12494D]/60 backdrop-blur-sm overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          <button
            onClick={() => setSelectedStage('ALL')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
              selectedStage === 'ALL'
                ? 'bg-white/10 border-white/40 text-white'
                : 'border-[#12494D] text-[#9CBFC2] hover:text-white'
            }`}
          >
            Kill chain
          </button>
          {STAGES.map((st, i) => {
            const n = stageCounts.get(st.key) ?? 0;
            const active = n > 0;
            const picked = selectedStage === st.key;
            return (
              <React.Fragment key={st.key}>
                <ChevronRight className="w-3 h-3 text-[#12494D]" />
                <button
                  disabled={!active}
                  onClick={() => setSelectedStage(picked ? 'ALL' : st.key)}
                  title={active ? `${st.key}: ${n} entities` : `${st.key}: not observed`}
                  style={{ ['--sc' as string]: st.color + '55', borderColor: active ? st.color + (picked ? 'ff' : '77') : '#0b2f33', color: active ? st.color : '#2c5559', background: picked ? st.color + '2e' : active ? st.color + '12' : 'transparent' }}
                  className={`flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border text-[10px] font-bold transition-all ${active ? 'cti-stage-active cursor-pointer hover:scale-105' : 'cursor-default opacity-60'}`}
                >
                  <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: active ? st.color + '2a' : 'transparent' }}>
                    <st.Icon size={12} strokeWidth={2.4} />
                  </span>
                  <span className="whitespace-nowrap">{i + 1}. {st.short}</span>
                  {active && <span className="font-mono px-1 rounded bg-black/30">{n}</span>}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Canvas Workspace */}
      <div className="flex-1 w-full h-full min-h-[640px] relative bg-transparent">
        {isLoading ? (
          <div className="absolute inset-0 bg-[#001314]/85 z-30 flex flex-col items-center justify-center space-y-3 backdrop-blur-sm">
            <div className="w-8 h-8 border-3 border-[#00C9D4] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-[#E6FFFF]">
              Reconstructing attack chain topology...
            </p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
            <div className="w-16 h-16 rounded-2xl bg-[#002629] text-[#00C9D4] border border-[#087F88] flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(0,201,212,0.2)]">
              <Layers className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-[#E6FFFF]">No attack chain available.</h3>
            <p className="text-xs text-[#9CBFC2] max-w-sm mt-1">
              Select and analyze a CTI report to reconstruct its dedicated attack chain.
            </p>
            <button
              onClick={onNavigateToUpload}
              className="mt-4 px-4 py-2 bg-[#00C9D4] hover:bg-[#00E5F0] text-[#001314] text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
            >
              Go to Upload & Select Report
            </button>
          </div>
        ) : (
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            minZoom={0.15}
            maxZoom={2.2}
            defaultEdgeOptions={{ type: 'ctiEdge' }}
            proOptions={{ hideAttribution: true }}
            className="bg-transparent"
          >
            {/* Dark cybersecurity network grid dots */}
            <Background color="#0E7490" gap={28} size={1.2} />
            <Controls className="!bg-[#001B1D]/90 !border !border-[#12494D] !shadow-lg !rounded-lg" />
            <MiniMap
              nodeColor={(n) => {
                const data = n.data as unknown as AttackGraphNodeData;
                return getEntityStyle(data?.entity_type, data?.icon).color;
              }}
              maskColor="rgba(0, 19, 20, 0.85)"
              className="!bg-[#001B1D]/90 !border !border-[#12494D] !rounded-lg !shadow-xl"
            />
          </ReactFlow>
        )}

        {/* Node Inspection Drawer / Side Panel (leaves 80%+ width for graph) */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-[#001B1D]/98 backdrop-blur-md rounded-2xl border border-[#12494D] shadow-2xl p-5 z-40 space-y-4 animate-in slide-in-from-right duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-[#12494D]">
              <div className="space-y-1">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white inline-block shadow-xs"
                  style={{ backgroundColor: selectedNode.color || '#087F88' }}
                >
                  {selectedNode.entity_type}
                </span>
                <h3 className="text-base font-bold text-[#E6FFFF] leading-snug">
                  {selectedNode.label}
                </h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[#9CBFC2] hover:text-[#E6FFFF] p-1 rounded-lg hover:bg-[#002629] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-semibold text-[#548286] uppercase tracking-wider block">
                  Normalized Entity Value
                </span>
                <p className="font-mono text-[#00E5F0] bg-[#001416] p-2 rounded-lg border border-[#12494D] break-all select-all mt-1">
                  {selectedNode.full_name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-[#001416] border border-[#12494D]">
                  <span className="text-[10px] text-[#548286] uppercase font-semibold block">Attack Stage</span>
                  <span className="font-bold text-[#E6FFFF] font-mono">{selectedNode.stage}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#001416] border border-[#12494D]">
                  <span className="text-[10px] text-[#548286] uppercase font-semibold block">Confidence</span>
                  <span className="font-bold text-[#00E5F0] font-mono">
                    {Math.round((selectedNode.confidence || 1.0) * 100)}%
                  </span>
                </div>
              </div>

              {selectedNode.evidence && (
                <div className="pt-1">
                  <span className="text-[10px] font-semibold text-[#548286] uppercase tracking-wider block mb-1">
                    Document Evidence Sentence
                  </span>
                  <blockquote className="p-3 bg-[#002629]/70 border-l-3 border-[#00C9D4] rounded-r-lg text-[#E6FFFF] italic text-[11px] leading-relaxed">
                    "{selectedNode.evidence}"
                  </blockquote>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#12494D] flex items-center justify-between">
              <span className="text-[10px] text-[#548286] font-mono">ID: {selectedNode.id}</span>
              <button
                onClick={onNavigateToDetails}
                className="text-xs text-[#00E5F0] hover:text-[#00C9D4] font-semibold flex items-center gap-1 hover:underline"
              >
                Inspect in Details
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Edge Inspection Drawer / Side Panel */}
        {selectedEdge && (
          <div className="absolute top-4 right-4 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-[#001B1D]/98 backdrop-blur-md rounded-2xl border border-[#12494D] shadow-2xl p-5 z-40 space-y-4 animate-in slide-in-from-right duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-[#12494D]">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#002629] text-[#00E5F0] border border-[#087F88] inline-block">
                  Relationship Link
                </span>
                <h3 className="text-base font-bold text-[#E6FFFF]">
                  {selectedEdge.label || selectedEdge.relationship_type}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEdge(null)}
                className="text-[#9CBFC2] hover:text-[#E6FFFF] p-1 rounded-lg hover:bg-[#002629] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#001416] rounded-xl border border-[#12494D] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#9CBFC2] font-semibold">Source:</span>
                  <span className="font-bold text-[#E6FFFF] font-mono">{selectedEdge.source_name}</span>
                </div>
                <div className="flex items-center justify-center text-[#00E5F0]">
                  <span className="text-[11px] font-mono px-2 py-0.5 bg-[#002629] border border-[#087F88] rounded font-semibold">
                    {selectedEdge.label || selectedEdge.relationship_type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9CBFC2] font-semibold">Target:</span>
                  <span className="font-bold text-[#E6FFFF] font-mono">{selectedEdge.target_name}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#001416] border border-[#12494D]">
                <span className="text-[#9CBFC2] font-medium">Classification:</span>
                <span className={`font-semibold capitalize ${selectedEdge.classification === 'inferred' ? 'text-[#F59E0B]' : 'text-[#00E5F0]'}`}>
                  {selectedEdge.classification} Link
                </span>
              </div>

              {selectedEdge.evidence && (
                <div>
                  <span className="text-[10px] font-semibold text-[#548286] uppercase tracking-wider block mb-1">
                    Extracted Sentence Context
                  </span>
                  <blockquote className="p-3 bg-[#002629]/70 border-l-3 border-[#00C9D4] rounded-r-lg text-[#E6FFFF] italic text-[11px] leading-relaxed">
                    "{selectedEdge.evidence}"
                  </blockquote>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const AttackChainDashboard: React.FC<AttackChainDashboardProps> = (props) => {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
};
