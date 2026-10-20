import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Network,
  Cpu,
  GitBranch,
  ShieldAlert,
  Fingerprint,
  History,
  Activity,
  Settings,
  Shield
} from 'lucide-react';

export type NavSection =
  | 'overview'
  | 'upload'
  | 'attack-chain'
  | 'entities'
  | 'relationships'
  | 'mitre'
  | 'iocs'
  | 'history'
  | 'evaluation'
  | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
  entityCount?: number;
  relationshipCount?: number;
  iocCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onNavigate,
  entityCount,
  relationshipCount,
  iocCount,
}) => {
  const navItems: {
    id: NavSection;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'upload',
      label: 'Upload CTI Report',
      icon: <UploadCloud className="w-5 h-5" />,
    },
    {
      id: 'attack-chain',
      label: 'Attack Chain',
      icon: <Network className="w-5 h-5 text-blue-600" />,
    },
    {
      id: 'entities',
      label: 'Entity Intelligence',
      icon: <Cpu className="w-5 h-5 text-indigo-600" />,
      badge: entityCount,
    },
    {
      id: 'relationships',
      label: 'Relationship Analysis',
      icon: <GitBranch className="w-5 h-5 text-teal-600" />,
      badge: relationshipCount,
    },
    {
      id: 'mitre',
      label: 'MITRE ATT&CK Mapping',
      icon: <ShieldAlert className="w-5 h-5 text-amber-600" />,
    },
    {
      id: 'iocs',
      label: 'IOC Intelligence',
      icon: <Fingerprint className="w-5 h-5 text-rose-600" />,
      badge: iocCount,
    },
    {
      id: 'history',
      label: 'Investigation History',
      icon: <History className="w-5 h-5 text-slate-600" />,
    },
    {
      id: 'evaluation',
      label: 'Model Evaluation',
      icon: <Activity className="w-5 h-5 text-purple-600" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5 text-slate-600" />,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen select-none shrink-0 shadow-xs">
      {/* Brand & SOC Header */}
      <div className="p-4 border-b border-slate-200 flex items-center space-x-3 bg-white">
        <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wide text-slate-900 uppercase">
            CTI Recon SOC
          </h1>
          <span className="text-[11px] text-blue-600 font-mono font-medium tracking-wider">
            Transformer v1.0
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Intelligence Platform
        </div>
        {navItems.map((item) => {
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={isActive ? 'text-blue-600' : 'text-slate-500'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-2 py-0.5 text-[11px] font-mono rounded-full border ${
                    isActive
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-[11px] font-medium text-slate-800">
            CTI Inference: Active
          </span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">Hugging Face NER & Syntactic Engine</p>
      </div>
    </aside>
  );
};
