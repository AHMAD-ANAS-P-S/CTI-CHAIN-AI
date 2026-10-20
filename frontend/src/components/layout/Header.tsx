import React from 'react';
import {
  FileText,
  Download,
  Play,
  RotateCw,
  ChevronDown
} from 'lucide-react';
import { ReportItem } from '../../types';

interface HeaderProps {
  reports: ReportItem[];
  selectedReport: ReportItem | null;
  onSelectReport: (report: ReportItem) => void;
  onAnalyze: () => void;
  onExport: (format: 'json' | 'markdown') => void;
  isAnalyzing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  reports,
  selectedReport,
  onSelectReport,
  onAnalyze,
  onExport,
  isAnalyzing,
}) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs">
      {/* Active Report Selector */}
      <div className="flex items-center space-x-3">
        <FileText className="w-5 h-5 text-blue-600" />
        <div className="relative group">
          <button className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 font-medium hover:border-blue-500 hover:text-blue-600 transition shadow-xs">
            <span className="truncate max-w-[280px]">
              {selectedReport ? selectedReport.original_filename : 'No Report Selected'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </button>

          {/* Dropdown list */}
          <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1">
            <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
              Switch Investigation Report
            </div>
            {reports.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">No reports available</div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {reports.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onSelectReport(r)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                      selectedReport?.id === r.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate">{r.original_filename}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                        r.status === 'analyzed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {r.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status Indicator */}
        {selectedReport && (
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider ${
              selectedReport.status === 'analyzed'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : selectedReport.status === 'analyzing'
                ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {selectedReport.status}
          </span>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-3">
        {selectedReport && (
          <>
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition shadow-xs ${
                isAnalyzing
                  ? 'bg-blue-50 text-blue-500 border border-blue-200 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Analyze Report</span>
                </>
              )}
            </button>

            {/* Export Dropdown */}
            <div className="relative group">
              <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:text-slate-900 hover:border-slate-400 transition shadow-xs">
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Report</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>
              <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1">
                <button
                  onClick={() => onExport('json')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition"
                >
                  Export Summary (JSON)
                </button>
                <button
                  onClick={() => onExport('markdown')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition"
                >
                  Export Report (Markdown)
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
