import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Search
} from 'lucide-react';
import { ExtractedRelationship } from '../../types';

interface RelationshipAnalysisViewProps {
  relationships: ExtractedRelationship[];
  isLoading: boolean;
  onUpdateStatus: (
    relId: string,
    status: 'unreviewed' | 'confirmed' | 'rejected' | 'uncertain'
  ) => void;
}

export const RelationshipAnalysisView: React.FC<RelationshipAnalysisViewProps> = ({
  relationships,
  isLoading,
  onUpdateStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<'ALL' | 'observed' | 'inferred'>('ALL');
  const [validationFilter, setValidationFilter] = useState<string>('ALL');

  const filteredRelationships = useMemo(() => {
    return relationships.filter((r) => {
      const matchesSearch =
        !searchQuery ||
        r.source_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.target_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.relationship_type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass =
        classificationFilter === 'ALL' || r.classification === classificationFilter;
      const matchesValidation =
        validationFilter === 'ALL' || r.validation_status === validationFilter;
      return matchesSearch && matchesClass && matchesValidation;
    });
  }, [relationships, searchQuery, classificationFilter, validationFilter]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
        <p className="text-xs font-mono">Loading Semantic Relationships...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Relationship Analysis & Analyst Validation
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Review, confirm, or reject semantic relationships identified across evidence sentences. Modifications immediately synchronize with the graph topology.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search entities or relationship..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-64 shadow-xs"
            />
          </div>

          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
          >
            <option value="ALL">All Classifications</option>
            <option value="observed">Observed Telemetry</option>
            <option value="inferred">Inferred / Hypothesis</option>
          </select>

          <select
            value={validationFilter}
            onChange={(e) => setValidationFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
          >
            <option value="ALL">All Validation States</option>
            <option value="unreviewed">Unreviewed</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
            <option value="uncertain">Uncertain</option>
          </select>
        </div>

        <span className="text-xs font-mono text-slate-500">
          Showing <strong>{filteredRelationships.length}</strong> of {relationships.length} connections
        </span>
      </div>

      {/* Relationships Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Source Entity</th>
                <th className="py-3 px-4 text-center">Relationship Type</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Supporting Evidence</th>
                <th className="py-3 px-4 text-right">Analyst Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRelationships.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No relationships matching current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRelationships.map((rel) => (
                  <tr key={rel.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900 max-w-[150px] truncate">
                      {rel.source_label}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <span>{rel.relationship_type}</span>
                        <ArrowRight className="w-3 h-3 text-blue-600" />
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-slate-900 max-w-[150px] truncate">
                      {rel.target_label}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-semibold ${
                          rel.classification === 'observed'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {rel.classification}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {Math.round(rel.confidence_score * 100)}%
                    </td>

                    <td className="py-3 px-4 max-w-sm truncate text-slate-600 italic text-[11px]">
                      "{rel.evidence_sentence || 'Identified via document relation pattern.'}"
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => onUpdateStatus(rel.id, 'confirmed')}
                          className={`p-1.5 rounded-lg border transition ${
                            rel.validation_status === 'confirmed'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300'
                          }`}
                          title="Confirm Relationship"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onUpdateStatus(rel.id, 'uncertain')}
                          className={`p-1.5 rounded-lg border transition ${
                            rel.validation_status === 'uncertain'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-amber-800 hover:bg-amber-50 hover:border-amber-300'
                          }`}
                          title="Mark Uncertain"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onUpdateStatus(rel.id, 'rejected')}
                          className={`p-1.5 rounded-lg border transition ${
                            rel.validation_status === 'rejected'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-300'
                          }`}
                          title="Reject Relationship"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
