import React, { useState, useMemo } from 'react';
import {
  Fingerprint,
  Download,
  Search,
  Globe,
  Radio,
  Mail,
  FileCode,
  Hash
} from 'lucide-react';
import { IndicatorOfCompromise } from '../../types';

interface IOCIntelligenceViewProps {
  iocs: IndicatorOfCompromise[];
  isLoading: boolean;
}

const IOC_ICONS: Record<string, React.ReactNode> = {
  ipv4: <Radio className="w-4 h-4 text-blue-600" />,
  ipv6: <Radio className="w-4 h-4 text-blue-600" />,
  domain: <Globe className="w-4 h-4 text-teal-600" />,
  url: <Globe className="w-4 h-4 text-cyan-600" />,
  email: <Mail className="w-4 h-4 text-indigo-600" />,
  sha256: <Hash className="w-4 h-4 text-rose-600" />,
  sha1: <Hash className="w-4 h-4 text-rose-600" />,
  md5: <Hash className="w-4 h-4 text-rose-600" />,
  filename: <FileCode className="w-4 h-4 text-purple-600" />,
};

export const IOCIntelligenceView: React.FC<IOCIntelligenceViewProps> = ({
  iocs,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  const iocTypes = useMemo(() => {
    return Array.from(new Set(iocs.map((i) => i.ioc_type))).sort();
  }, [iocs]);

  const filteredIOCs = useMemo(() => {
    return iocs.filter((i) => {
      const matchesSearch =
        !searchQuery ||
        i.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.ioc_type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'ALL' || i.ioc_type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [iocs, searchQuery, selectedType]);

  const exportCSV = () => {
    const headers = ['IOC Type', 'Value', 'Verification Status', 'Evidence'];
    const rows = filteredIOCs.map((i) => [
      `"${i.ioc_type}"`,
      `"${i.value.replace(/"/g, '""')}"`,
      `"${i.verification_status}"`,
      `"${(i.evidence_sentence || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'cti_indicators_of_compromise.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredIOCs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cti_indicators_of_compromise.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mb-3" />
        <p className="text-xs font-mono">Parsing Indicators of Compromise...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Indicators of Compromise (IOC) Intelligence
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Structured network and forensic artifacts extracted passively from document text. Never auto-scanned or executed.
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

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search IOC value or type..."
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
            <option value="ALL">All IOC Categories ({iocTypes.length})</option>
            {iocTypes.map((t) => (
              <option key={t} value={t}>
                {t.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-mono text-slate-500">
          Total <strong>{filteredIOCs.length}</strong> IOCs cataloged
        </span>
      </div>

      {/* IOC Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Indicator Value</th>
                <th className="py-3 px-4">Verification State</th>
                <th className="py-3 px-4">Source Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredIOCs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No Indicators of Compromise found matching current filter.
                  </td>
                </tr>
              ) : (
                filteredIOCs.map((ioc) => (
                  <tr key={ioc.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {IOC_ICONS[ioc.ioc_type] || <Fingerprint className="w-4 h-4 text-slate-500" />}
                        <span className="font-mono text-[10px] font-bold uppercase text-slate-800">
                          {ioc.ioc_type}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-slate-900 break-all select-all">
                      {ioc.value}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                        {ioc.verification_status}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-md truncate text-slate-600 italic text-[11px]">
                      "{ioc.evidence_sentence || 'Identified in report telemetry'}"
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
