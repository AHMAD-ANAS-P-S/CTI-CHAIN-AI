import React, { useState } from 'react';
import {
  FileText,
  Download,
  Trash2,
  ExternalLink,
  Search
} from 'lucide-react';
import { ReportItem } from '../../types';

interface InvestigationHistoryViewProps {
  reports: ReportItem[];
  isLoading: boolean;
  onSelectReport: (report: ReportItem) => void;
  onAnalyzeReport: (reportId: string) => void;
  onDeleteReport: (reportId: string) => void;
  onExportReport: (reportId: string, format: 'json' | 'markdown') => void;
}

export const InvestigationHistoryView: React.FC<InvestigationHistoryViewProps> = ({
  reports,
  isLoading,
  onSelectReport,
  onDeleteReport,
  onExportReport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReports = reports.filter((r) =>
    r.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mb-3" />
        <p className="text-xs font-mono">Loading Investigation Records...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Investigation History & Audit Logs
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Historical archive of processed CTI reports, reconstructed attack chains, and analytical exports.
        </p>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search report filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-72 shadow-xs"
          />
        </div>

        <span className="text-xs font-mono text-slate-500">
          Total <strong>{filteredReports.length}</strong> investigations recorded
        </span>
      </div>

      {/* Reports Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Format</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Entities</th>
                <th className="py-3 px-4">Relationships</th>
                <th className="py-3 px-4">Investigation Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No investigations found in database history.
                  </td>
                </tr>
              ) : (
                filteredReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate max-w-xs">{rep.original_filename}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono uppercase text-slate-500">
                      {rep.file_type}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono text-[10px] uppercase font-semibold ${
                          rep.status === 'analyzed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : rep.status === 'analyzing'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {rep.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {rep.total_entities ?? 0}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-teal-700">
                      {rep.total_relationships ?? 0}
                    </td>

                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(rep.created_at).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onSelectReport(rep)}
                          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center space-x-1 shadow-xs transition"
                          title="Open in Attack Chain"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => onExportReport(rep.id, 'markdown')}
                          className="p-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
                          title="Export Report (Markdown)"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteReport(rep.id)}
                          className="p-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition"
                          title="Delete Report"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
