import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  ArrowLeft,
  UploadCloud,
  Activity,
  Layers,
  FileCode,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import {
  ReportItem,
  ExtractedEntity,
  ExtractedRelationship,
  IndicatorOfCompromise,
  MITREMapping,
  AttackGraphResponse,
} from '../../types';
import { reportApi } from '../../services/api';
import { generateGraphSvg, downloadSvgFile, downloadPngFromSvg } from '../attack-graph/graphExporter';

interface AttackDetailsDashboardProps {
  currentReport: ReportItem | null;
  graphData: AttackGraphResponse | null;
  onNavigateToGraph: () => void;
  onNavigateToUpload: () => void;
}

export const AttackDetailsDashboard: React.FC<AttackDetailsDashboardProps> = ({
  currentReport,
  graphData,
  onNavigateToGraph,
  onNavigateToUpload,
}) => {
  const [entities, setEntities] = useState<ExtractedEntity[]>([]);
  const [relationships, setRelationships] = useState<ExtractedRelationship[]>([]);
  const [iocs, setIocs] = useState<IndicatorOfCompromise[]>([]);
  const [mitreMappings, setMitreMappings] = useState<MITREMapping[]>([]);
  const [, setRawSummary] = useState<Record<string, unknown> | null>(null);

  const [, setIsLoading] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  // Load all structured intelligence data for active report
  useEffect(() => {
    if (!currentReport?.id) return;

    setIsLoading(true);
    Promise.all([
      reportApi.getEntities(currentReport.id).catch(() => []),
      reportApi.getRelationships(currentReport.id).catch(() => []),
      reportApi.getIOCs(currentReport.id).catch(() => []),
      reportApi.getMITRE(currentReport.id).catch(() => []),
      reportApi.exportReport(currentReport.id, 'json').catch(() => null),
    ])
      .then(([entData, relData, iocData, mitreData, summaryData]) => {
        setEntities(entData);
        setRelationships(relData);
        setIocs(iocData);
        setMitreMappings(mitreData);
        setRawSummary(summaryData);
      })
      .finally(() => setIsLoading(false));
  }, [currentReport?.id]);

  // Map MITRE techniques by entity normalized value
  const entityMitreMap = React.useMemo(() => {
    const map = new Map<string, MITREMapping[]>();
    mitreMappings.forEach((m) => {
      entities.forEach((e) => {
        if (
          m.evidence_sentence &&
          e.evidence_sentence &&
          m.evidence_sentence.includes(e.normalized_value)
        ) {
          const list = map.get(e.id) || [];
          list.push(m);
          map.set(e.id, list);
        }
      });
    });
    return map;
  }, [mitreMappings, entities]);

  // Group IOCs by category
  const groupedIocs = React.useMemo(() => {
    const groups: Record<string, IndicatorOfCompromise[]> = {};
    iocs.forEach((ioc) => {
      const type = ioc.ioc_type.toUpperCase();
      if (!groups[type]) groups[type] = [];
      groups[type].push(ioc);
    });
    return groups;
  }, [iocs]);

  // 1. Download Attack Chain PNG
  const handleDownloadPng = async () => {
    if (!graphData?.nodes) return;
    setDownloadingFormat('png');
    try {
      const rfNodes = graphData.nodes.map((n) => ({
        id: n.id,
        type: 'ctiNode',
        position: n.position,
        data: n.data,
      }));
      const rfEdges = graphData.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        data: e.data,
      }));
      const svg = generateGraphSvg(rfNodes, rfEdges);
      await downloadPngFromSvg(svg, `attack_chain_${currentReport?.original_filename || 'graph'}.png`);
    } catch (err) {
      console.error('Failed to download PNG:', err);
    } finally {
      setDownloadingFormat(null);
    }
  };

  // 2. Download Attack Chain SVG
  const handleDownloadSvg = () => {
    if (!graphData?.nodes) return;
    setDownloadingFormat('svg');
    try {
      const rfNodes = graphData.nodes.map((n) => ({
        id: n.id,
        type: 'ctiNode',
        position: n.position,
        data: n.data,
      }));
      const rfEdges = graphData.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        data: e.data,
      }));
      const svg = generateGraphSvg(rfNodes, rfEdges);
      downloadSvgFile(svg, `attack_chain_${currentReport?.original_filename || 'graph'}.svg`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  // 3. Download Investigation Report PDF
  const handleDownloadPdf = async () => {
    if (!currentReport?.id) return;
    setDownloadingFormat('pdf');
    try {
      const blob = await reportApi.exportReport(currentReport.id, 'pdf');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `investigation_${currentReport.original_filename || 'report'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setDownloadingFormat(null);
    }
  };

  // 4. Download Analysis JSON
  const handleDownloadJson = async () => {
    if (!currentReport?.id) return;
    setDownloadingFormat('json');
    try {
      const jsonData = await reportApi.exportReport(currentReport.id, 'json');
      const jsonStr = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cti_analysis_${currentReport.original_filename || 'report'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download JSON:', err);
    } finally {
      setDownloadingFormat(null);
    }
  };

  if (!currentReport || !graphData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#002629] text-[#00C9D4] border border-[#087F88] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,201,212,0.2)]">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#E6FFFF]">No analysis results available.</h2>
        <p className="text-sm text-[#9CBFC2] max-w-md mx-auto">
          Please select or upload a CTI report in Dashboard 1 and click Analyze Report to generate and view structured intelligence details.
        </p>
        <button
          onClick={onNavigateToUpload}
          className="px-5 py-2.5 bg-[#00C9D4] hover:bg-[#00E5F0] text-[#001314] text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          Go to Upload & Select Report
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header & Navigation Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#12494D]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#00E5F0] uppercase tracking-wider mb-1">
            <span>Dashboard 3</span>
            <span className="text-[#087F88]">•</span>
            <span>Attack Intelligence & Exports</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#E6FFFF] tracking-tight">
            Attack Chain Details & Downloads
          </h1>
          <p className="text-xs sm:text-sm text-[#9CBFC2] mt-0.5">
            Structured forensic analysis, chronological attack progression, and multi-format evidence exports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToGraph}
            className="px-3 py-2 bg-[#002629] hover:bg-[#00353A] text-[#E6FFFF] hover:text-[#00E5F0] border border-[#12494D] hover:border-[#087F88] rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#00C9D4]" />
            Back to Attack Chain
          </button>
          <button
            onClick={onNavigateToUpload}
            className="px-3 py-2 bg-[#002629] hover:bg-[#00353A] text-[#E6FFFF] hover:text-[#00E5F0] border border-[#12494D] hover:border-[#087F88] rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#00C9D4]" />
            New Report
          </button>
        </div>
      </div>

      {/* Prominent Export Actions Banner (The 4 Download Buttons) */}
      <div className="bg-[#001B1D]/90 backdrop-blur-md border border-[#12494D] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-[#00C9D4]" />
            <h2 className="text-base font-bold text-[#E6FFFF]">
              Download Investigation Artifacts
            </h2>
          </div>
          <span className="text-xs text-[#00E5F0] font-medium font-mono">
            Production-Ready Intelligence Exports
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Button 1: Download Attack Chain PNG */}
          <button
            onClick={handleDownloadPng}
            disabled={downloadingFormat !== null}
            className="p-4 bg-[#002225] hover:bg-[#002E33] border border-[#12494D] hover:border-[#00C9D4] rounded-xl text-left transition-all shadow-md group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#00383D] text-[#00E5F0] border border-[#087F88] flex items-center justify-center font-bold text-xs mb-2 group-hover:scale-105 transition-transform shadow-[0_0_10px_rgba(0,229,240,0.2)]">
                PNG
              </div>
              <span className="font-bold text-xs text-[#E6FFFF] block">
                Attack Chain Image
              </span>
              <span className="text-[11px] text-[#9CBFC2] block mt-0.5">
                High-resolution PNG diagram
              </span>
            </div>
            <span className="text-xs text-[#00C9D4] group-hover:text-[#00E5F0] font-semibold mt-3 flex items-center gap-1">
              {downloadingFormat === 'png' ? 'Exporting...' : 'Download PNG'}
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* Button 2: Download Attack Chain SVG */}
          <button
            onClick={handleDownloadSvg}
            disabled={downloadingFormat !== null}
            className="p-4 bg-[#002225] hover:bg-[#002E33] border border-[#12494D] hover:border-[#00C9D4] rounded-xl text-left transition-all shadow-md group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#00383D] text-[#00E5F0] border border-[#087F88] flex items-center justify-center font-bold text-xs mb-2 group-hover:scale-105 transition-transform shadow-[0_0_10px_rgba(0,229,240,0.2)]">
                SVG
              </div>
              <span className="font-bold text-xs text-[#E6FFFF] block">
                Attack Chain Vector
              </span>
              <span className="text-[11px] text-[#9CBFC2] block mt-0.5">
                Scalable vector graphic
              </span>
            </div>
            <span className="text-xs text-[#00C9D4] group-hover:text-[#00E5F0] font-semibold mt-3 flex items-center gap-1">
              {downloadingFormat === 'svg' ? 'Exporting...' : 'Download SVG'}
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* Button 3: Download Investigation Report PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingFormat !== null}
            className="p-4 bg-[#002225] hover:bg-[#002E33] border border-[#12494D] hover:border-[#E52535] rounded-xl text-left transition-all shadow-md group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#290005] text-[#FF8A95] border border-[#E52535] flex items-center justify-center font-bold text-xs mb-2 group-hover:scale-105 transition-transform shadow-[0_0_10px_rgba(229,37,53,0.2)]">
                PDF
              </div>
              <span className="font-bold text-xs text-[#E6FFFF] block">
                Investigation Report
              </span>
              <span className="text-[11px] text-[#9CBFC2] block mt-0.5">
                Full evidence report with findings
              </span>
            </div>
            <span className="text-xs text-[#FF8A95] group-hover:text-[#FFB3BA] font-semibold mt-3 flex items-center gap-1">
              {downloadingFormat === 'pdf' ? 'Generating PDF...' : 'Download PDF'}
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* Button 4: Download Analysis JSON */}
          <button
            onClick={handleDownloadJson}
            disabled={downloadingFormat !== null}
            className="p-4 bg-[#002225] hover:bg-[#002E33] border border-[#12494D] hover:border-[#14B8A6] rounded-xl text-left transition-all shadow-md group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#00383D] text-[#5EEAD4] border border-[#14B8A6] flex items-center justify-center font-bold text-xs mb-2 group-hover:scale-105 transition-transform shadow-[0_0_10px_rgba(20,184,166,0.2)]">
                JSON
              </div>
              <span className="font-bold text-xs text-[#E6FFFF] block">
                Raw Intelligence JSON
              </span>
              <span className="text-[11px] text-[#9CBFC2] block mt-0.5">
                Entities, graph, IOCs & MITRE
              </span>
            </div>
            <span className="text-xs text-[#5EEAD4] group-hover:text-[#CCFBF1] font-semibold mt-3 flex items-center gap-1">
              {downloadingFormat === 'json' ? 'Exporting...' : 'Download JSON'}
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      </div>

      {/* SECTION A: Report Summary */}
      <div className="bg-[#001B1D]/90 backdrop-blur-md rounded-2xl border border-[#12494D] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#12494D] pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#00C9D4]" />
            <h3 className="text-sm font-bold text-[#E6FFFF] uppercase tracking-wider">
              Section A: Investigation Report Summary
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#002629] text-[#00E5F0] border border-[#087F88]">
            Status: Analyzed
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-[#001416] border border-[#12494D]">
            <span className="text-[11px] text-[#548286] font-medium block">Report Filename</span>
            <span className="text-sm font-bold text-[#E6FFFF] truncate block mt-0.5" title={currentReport.original_filename}>
              {currentReport.original_filename}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#001416] border border-[#12494D]">
            <span className="text-[11px] text-[#548286] font-medium block">Upload Timestamp</span>
            <span className="text-sm font-bold text-[#E6FFFF] truncate block mt-0.5 font-mono">
              {new Date(currentReport.created_at).toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#001416] border border-[#12494D]">
            <span className="text-[11px] text-[#548286] font-medium block">Extracted Threat Entities</span>
            <span className="text-sm font-bold text-[#00E5F0] block mt-0.5 font-mono">
              {entities.length} Unique Entities
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#001416] border border-[#12494D]">
            <span className="text-[11px] text-[#548286] font-medium block">Identified Relationships</span>
            <span className="text-sm font-bold text-[#00C9D4] block mt-0.5 font-mono">
              {relationships.length} Links
            </span>
          </div>
        </div>

        {/* Key Stages Banner */}
        {graphData?.stages && graphData.stages.length > 0 && (
          <div className="p-3 bg-[#001416] rounded-xl border border-[#12494D] flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-[#9CBFC2]">Attack Stages Identified:</span>
            {graphData.stages.map((stage) => (
              <span
                key={stage}
                className="px-2 py-0.5 rounded-md bg-[#002629] border border-[#087F88] text-[#00E5F0] font-medium font-mono text-[11px]"
              >
                {stage}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* SECTION B: Reconstructed Attack Sequence */}
      <div className="bg-[#001B1D]/90 backdrop-blur-md rounded-2xl border border-[#12494D] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#12494D] pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00C9D4]" />
            <h3 className="text-sm font-bold text-[#E6FFFF] uppercase tracking-wider">
              Section B: Chronological Attack Sequence
            </h3>
          </div>
          <span className="text-xs text-[#00E5F0] font-mono">
            {relationships.length} Step Progression
          </span>
        </div>

        <div className="space-y-3">
          {relationships.length === 0 ? (
            <p className="text-xs text-[#9CBFC2] italic py-4 text-center">
              No sequential attack chain steps extracted.
            </p>
          ) : (
            relationships.map((rel, idx) => (
              <div
                key={rel.id}
                className="p-4 rounded-xl border border-[#12494D] hover:border-[#087F88] transition-colors bg-[#002225] shadow-xs space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#00383D] text-[#00E5F0] border border-[#087F88] text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-xs sm:text-sm text-[#E6FFFF] font-mono">
                      {rel.source_label}
                    </span>
                    <span className="text-[#548286] font-mono">→</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#002629] text-[#00E5F0] border border-[#087F88]">
                      {rel.relationship_type}
                    </span>
                    <span className="text-[#548286] font-mono">→</span>
                    <span className="font-bold text-xs sm:text-sm text-[#E6FFFF] font-mono">
                      {rel.target_label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        rel.classification === 'inferred'
                          ? 'bg-[#291A00] text-[#FCD34D] border border-[#D97706]'
                          : 'bg-[#002629] text-[#00E5F0] border border-[#087F88]'
                      }`}
                    >
                      {rel.classification}
                    </span>
                    <span className="text-xs text-[#9CBFC2] font-mono">
                      {Math.round((rel.confidence_score || 1) * 100)}% Conf
                    </span>
                  </div>
                </div>

                {rel.evidence_sentence && (
                  <blockquote className="text-xs text-[#E6FFFF] bg-[#001416] p-2.5 rounded-lg border-l-2 border-[#00C9D4] italic">
                    "{rel.evidence_sentence}"
                  </blockquote>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION C: Extracted Threat Entities Table */}
      <div className="bg-[#001B1D]/90 backdrop-blur-md rounded-2xl border border-[#12494D] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#12494D] pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00C9D4]" />
            <h3 className="text-sm font-bold text-[#E6FFFF] uppercase tracking-wider">
              Section C: Extracted Threat Entities ({entities.length})
            </h3>
          </div>
          <span className="text-xs text-[#00E5F0] font-mono">
            CTI-BERT Named Entity Recognition
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#002629] text-[#9CBFC2] font-semibold border-b border-[#12494D]">
              <tr>
                <th className="py-2.5 px-3">Entity Value</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Attack Stage</th>
                <th className="py-2.5 px-3">MITRE Mapping</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#12494D]">
              {entities.map((entity) => {
                const mitre = entityMitreMap.get(entity.id) || [];
                return (
                  <tr key={entity.id} className="hover:bg-[#002225]/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#E6FFFF]">
                      {entity.normalized_value}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-[#001416] text-[#00E5F0] font-mono text-[10px] font-semibold border border-[#12494D]">
                        {entity.entity_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#00E5F0]">
                      {Math.round((entity.confidence_score || 1) * 100)}%
                    </td>
                    <td className="py-2.5 px-3 text-[#9CBFC2] font-mono text-[11px]">
                      {entity.attack_stage || 'Execution'}
                    </td>
                    <td className="py-2.5 px-3">
                      {mitre.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {mitre.map((m) => (
                            <span
                              key={m.technique_id}
                              className="px-1.5 py-0.5 bg-[#002629] text-[#00E5F0] font-mono text-[10px] rounded border border-[#087F88]"
                              title={`${m.technique_name} (${m.tactic})`}
                            >
                              {m.technique_id}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#548286] text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION D: Relationship Details Table */}
      <div className="bg-[#001B1D]/90 backdrop-blur-md rounded-2xl border border-[#12494D] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#12494D] pb-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-[#00C9D4]" />
            <h3 className="text-sm font-bold text-[#E6FFFF] uppercase tracking-wider">
              Section D: Relationship Details ({relationships.length})
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#002629] text-[#9CBFC2] font-semibold border-b border-[#12494D]">
              <tr>
                <th className="py-2.5 px-3">Source Entity</th>
                <th className="py-2.5 px-3">Relationship Type</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3">Evidence Sentence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#12494D]">
              {relationships.map((r) => (
                <tr key={r.id} className="hover:bg-[#002225]/70 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-semibold text-[#E6FFFF]">
                    {r.source_label}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#002629] text-[#00E5F0] border border-[#087F88]">
                      {r.relationship_type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-[#E6FFFF]">
                    {r.target_label}
                  </td>
                  <td className="py-2.5 px-3 text-[#9CBFC2] italic text-[11px] max-w-md">
                    {r.evidence_sentence || 'Implicit report correlation'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION E: Extracted IOCs */}
      <div className="bg-[#001B1D]/90 backdrop-blur-md rounded-2xl border border-[#12494D] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#12494D] pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#00C9D4]" />
            <h3 className="text-sm font-bold text-[#E6FFFF] uppercase tracking-wider">
              Section E: Extracted Indicators of Compromise ({iocs.length})
            </h3>
          </div>
          <span className="text-xs text-[#00E5F0] font-mono">
            Defanged & Verified Threat IOCs
          </span>
        </div>

        {Object.keys(groupedIocs).length === 0 ? (
          <p className="text-xs text-[#9CBFC2] italic py-4 text-center">
            No atomic network or host indicators extracted.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(groupedIocs).map(([type, list]) => (
              <div key={type} className="p-4 rounded-xl bg-[#001416] border border-[#12494D] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#00E5F0] font-mono">
                    {type} ({list.length})
                  </span>
                  <span className="text-[10px] font-bold text-[#00C9D4] uppercase">
                    Verified
                  </span>
                </div>
                <div className="space-y-1.5">
                  {list.map((ioc) => (
                    <div
                      key={ioc.id}
                      className="p-2 bg-[#002225] rounded-lg border border-[#12494D] font-mono text-xs text-[#E6FFFF] break-all select-all flex items-center justify-between gap-2"
                    >
                      <span>{ioc.value}</span>
                      <span className="text-[10px] text-[#00E5F0] font-semibold uppercase shrink-0">
                        {ioc.verification_status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
