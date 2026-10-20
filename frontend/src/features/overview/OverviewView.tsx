import React from 'react';
import {
  FileText,
  Cpu,
  GitBranch,
  Network,
  Fingerprint,
  ShieldAlert,
  ArrowRight,
  Activity
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { DashboardStats } from '../../types';

interface OverviewViewProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  onNavigateToReport: (reportId: string) => void;
  onNavigateToUpload: () => void;
}

const STAGE_COLORS: Record<string, string> = {
  'Initial access': '#2563eb',
  'Delivery': '#4f46e5',
  'Execution': '#dc2626',
  'Persistence': '#d97706',
  'Command and control': '#d97706',
  'Collection': '#0d9488',
  'Exfiltration': '#b91c1c',
  'Impact': '#991b1b',
};

const ENTITY_COLORS = ['#2563eb', '#4f46e5', '#0d9488', '#d97706', '#dc2626', '#7c3aed', '#0284c7', '#059669'];

export const OverviewView: React.FC<OverviewViewProps> = ({
  stats,
  isLoading,
  onNavigateToReport,
  onNavigateToUpload,
}) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
        <p className="text-xs font-mono">Aggregating SOC Telemetry Records...</p>
      </div>
    );
  }

  const hasData = stats && stats.total_reports > 0;

  // Chart data formatters
  const entityData = stats?.entity_distribution
    ? Object.entries(stats.entity_distribution).map(([type, count]) => ({
        type,
        count,
      }))
    : [];

  const stageData = stats?.stage_distribution
    ? Object.entries(stats.stage_distribution).map(([stage, count]) => ({
        stage,
        count,
      }))
    : [];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 space-y-8">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Security Operations Center (SOC) Intelligence Overview
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Empirical telemetry summary derived strictly from analyzed cyber threat intelligence reports.
          </p>
        </div>
        <button
          onClick={onNavigateToUpload}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
        >
          <span>Upload New Report</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Primary KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Reports</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {stats?.total_reports ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Analyzed CTI Files</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Threat Entities</span>
            <Cpu className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-indigo-700">
            {stats?.total_entities ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Extracted & Linked</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Relationships</span>
            <GitBranch className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-teal-700">
            {stats?.total_relationships ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Evidence-Backed</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Attack Chains</span>
            <Network className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-purple-700">
            {stats?.total_attack_chains ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Reconstructed Graphs</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-semibold uppercase tracking-wider">IOCs</span>
            <Fingerprint className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-rose-700">
            {stats?.total_iocs ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Passive Indicators</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-semibold uppercase tracking-wider">MITRE ATT&CK</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-700">
            {stats?.total_mitre_techniques ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Mapped Techniques</span>
        </div>
      </div>

      {!hasData ? (
        /* Empty State */
        <div className="p-12 rounded-xl bg-white border border-slate-200 text-center space-y-4 shadow-xs">
          <Activity className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Intelligence Records Yet</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Operational statistics reflect real extracted telemetry. Upload a security report or load a built-in scenario to populate this dashboard.
          </p>
          <button
            onClick={onNavigateToUpload}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
          >
            Go to Upload Page
          </button>
        </div>
      ) : (
        /* Charts and Tables */
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Entity Distribution Chart */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Entity-Type Distribution
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  {entityData.length} Extracted Categories
                </span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={entityData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <XAxis type="number" stroke="#64748B" fontSize={11} />
                    <YAxis dataKey="type" type="category" stroke="#475569" fontSize={10} width={90} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        color: '#172033',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {entityData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={ENTITY_COLORS[index % ENTITY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attack Stage Distribution Chart */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Attack-Stage Distribution
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  Observed Stage Progression
                </span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis
                      dataKey="stage"
                      stroke="#475569"
                      fontSize={9}
                      angle={-25}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        color: '#172033',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stageData.map((entry) => (
                        <Cell
                          key={entry.stage}
                          fill={STAGE_COLORS[entry.stage] || '#2563eb'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Investigations Table */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Recent Threat Intelligence Investigations
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Report Document</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Entities</th>
                    <th className="py-2.5 px-3">Relationships</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats?.recent_investigations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {inv.filename}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                        {inv.total_entities}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-700">
                        {inv.total_relationships}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onNavigateToReport(inv.id)}
                          className="text-blue-600 hover:text-blue-700 font-bold"
                        >
                          Open Graph →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
