import React, { useState, useMemo } from 'react';
import {
  ExternalLink,
  Search
} from 'lucide-react';
import { MITREMapping } from '../../types';

interface MITREMappingViewProps {
  mappings: MITREMapping[];
  isLoading: boolean;
}

export const MITREMappingView: React.FC<MITREMappingViewProps> = ({
  mappings,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTactic, setSelectedTactic] = useState('ALL');

  const tactics = useMemo(() => {
    return Array.from(new Set(mappings.map((m) => m.tactic))).sort();
  }, [mappings]);

  const filteredMappings = useMemo(() => {
    return mappings.filter((m) => {
      const matchesSearch =
        !searchQuery ||
        m.technique_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.technique_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.tactic.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTactic =
        selectedTactic === 'ALL' || m.tactic.includes(selectedTactic);
      return matchesSearch && matchesTactic;
    });
  }, [mappings, searchQuery, selectedTactic]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-3" />
        <p className="text-xs font-mono">Correlating Behaviors with MITRE ATT&CK Enterprise Matrix...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          MITRE ATT&CK Enterprise Mapping
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Evidence-grounded adversary tactics, techniques, and procedures (TTPs) correlated with extracted report behaviors.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search technique ID or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-64 shadow-xs"
            />
          </div>

          <select
            value={selectedTactic}
            onChange={(e) => setSelectedTactic(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
          >
            <option value="ALL">All Tactics ({tactics.length})</option>
            {tactics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-mono text-slate-500">
          Mapped <strong>{filteredMappings.length}</strong> Techniques
        </span>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMappings.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-xs">
            No MITRE ATT&CK techniques match the search criteria.
          </div>
        ) : (
          filteredMappings.map((m) => (
            <div
              key={m.id}
              className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition space-y-3 flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    {m.technique_id}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                    {m.tactic}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{m.technique_name}</h3>

                <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 italic text-[11px] leading-relaxed">
                  "{m.evidence_sentence}"
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-500 font-mono font-medium">Confidence:</span>
                  <span className="font-mono font-bold text-amber-700">
                    {Math.round(m.confidence_score * 100)}%
                  </span>
                </div>

                {m.url && (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-bold text-xs transition"
                  >
                    <span>ATT&CK Spec</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
