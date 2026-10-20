import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Eye,
  X,
  ArrowUpDown
} from 'lucide-react';
import { ExtractedEntity } from '../../types';

interface EntityIntelligenceViewProps {
  entities: ExtractedEntity[];
  isLoading: boolean;
  onSelectEntityForGraph?: (entityId: string) => void;
}

export const EntityIntelligenceView: React.FC<EntityIntelligenceViewProps> = ({
  entities,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [sortField, setSortField] = useState<'normalized_value' | 'entity_type' | 'confidence_score' | 'attack_stage'>('entity_type');
  const [sortAsc, setSortAsc] = useState(true);

  // Selected evidence modal
  const [activeEvidence, setActiveEvidence] = useState<ExtractedEntity | null>(null);

  // Filter types and stages
  const entityTypes = useMemo(() => {
    return Array.from(new Set(entities.map((e) => e.entity_type))).sort();
  }, [entities]);

  const stages = useMemo(() => {
    return Array.from(new Set(entities.map((e) => e.attack_stage).filter(Boolean) as string[])).sort();
  }, [entities]);

  // Filtered & Sorted entities
  const processedEntities = useMemo(() => {
    return entities
      .filter((e) => {
        const matchesSearch =
          !searchQuery ||
          e.original_value.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.normalized_value.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.entity_type.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = selectedType === 'ALL' || e.entity_type === selectedType;
        const matchesStage = selectedStage === 'ALL' || e.attack_stage === selectedStage;
        return matchesSearch && matchesType && matchesStage;
      })
      .sort((a, b) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [entities, searchQuery, selectedType, selectedStage, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const exportCSV = () => {
    const headers = ['Entity Type', 'Original Value', 'Normalized Value', 'Attack Stage', 'Confidence', 'Evidence'];
    const rows = processedEntities.map((e) => [
      `"${e.entity_type}"`,
      `"${e.original_value.replace(/"/g, '""')}"`,
      `"${e.normalized_value.replace(/"/g, '""')}"`,
      `"${e.attack_stage || ''}"`,
      e.confidence_score,
      `"${(e.evidence_sentence || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'cti_extracted_entities.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(processedEntities, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cti_extracted_entities.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
        <p className="text-xs font-mono">Loading Entity Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 space-y-6">
      {/* Title & Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Threat Entity Intelligence
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Normalized CTI entities extracted by Transformer token-classification and syntactic pattern adapters.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400 text-xs font-medium transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={exportJSON}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400 text-xs font-medium transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search entity or value..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-64 shadow-xs"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
          >
            <option value="ALL">All Entity Types ({entityTypes.length})</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
          >
            <option value="ALL">All Stages ({stages.length})</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-mono text-slate-500">
          Showing <strong>{processedEntities.length}</strong> of {entities.length} entities
        </span>
      </div>

      {/* Entity Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
              <tr>
                <th
                  onClick={() => handleSort('entity_type')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center space-x-1">
                    <span>Entity Type</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('normalized_value')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center space-x-1">
                    <span>Normalized / Original Value</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('attack_stage')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center space-x-1">
                    <span>Attack Stage</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('confidence_score')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center space-x-1">
                    <span>Confidence</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Evidence</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {processedEntities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No threat entities match your search filter.
                  </td>
                </tr>
              ) : (
                processedEntities.map((ent) => (
                  <tr key={ent.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {ent.entity_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-900 font-semibold break-all max-w-sm">
                        {ent.normalized_value}
                      </div>
                      {ent.original_value !== ent.normalized_value && (
                        <div className="text-[10px] text-slate-500 font-mono italic">
                          raw: {ent.original_value}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
                        {ent.attack_stage || 'Execution'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-800">
                          {Math.round(ent.confidence_score * 100)}%
                        </span>
                        <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${ent.confidence_score * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600 text-[11px] italic">
                      "{ent.evidence_sentence || 'Identified in telemetry'}"
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setActiveEvidence(ent)}
                        className="p-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-200 transition"
                        title="View Evidence Context"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evidence Sentence Drawer/Modal */}
      {activeEvidence && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                  {activeEvidence.entity_type}
                </span>
                <h3 className="text-sm font-bold text-slate-900 font-mono mt-1 break-all">
                  {activeEvidence.original_value}
                </h3>
              </div>
              <button
                onClick={() => setActiveEvidence(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Source Evidence Sentence
                </span>
                <div className="mt-1 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 italic leading-relaxed">
                  "{activeEvidence.evidence_sentence}"
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Paragraph Index</span>
                  <span className="font-mono text-slate-800 font-semibold">
                    Paragraph #{activeEvidence.paragraph_index + 1}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Attack Stage</span>
                  <span className="font-mono text-teal-700 font-semibold">
                    {activeEvidence.attack_stage || 'Execution'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setActiveEvidence(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
