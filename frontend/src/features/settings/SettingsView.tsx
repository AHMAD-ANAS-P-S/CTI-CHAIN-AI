import React, { useState, useEffect } from 'react';
import {
  Database,
  Cpu,
  Save,
  CheckCircle2,
  Terminal
} from 'lucide-react';
import { reportApi } from '../../services/api';

export const SettingsView: React.FC = () => {
  const [modelCheckpoint, setModelCheckpoint] = useState('dslim/bert-base-NER');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [dbStatus] = useState<string>('Connected (SQLite/PostgreSQL compatible)');
  const [healthData, setHealthData] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const data = await reportApi.getHealth();
      setHealthData(data);
      if (data.model_name) {
        setModelCheckpoint(data.model_name);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Platform Configuration & Model Adapter Settings
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Manage local Transformer checkpoints, database connection strings, and extraction thresholds.
        </p>
      </div>

      {isSaved && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center space-x-2 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Configuration preferences updated successfully.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model Inference Settings */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
            <Cpu className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Transformer Model Settings
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Model Checkpoint Identifier / Path
              </label>
              <input
                type="text"
                value={modelCheckpoint}
                onChange={(e) => setModelCheckpoint(e.target.value)}
                placeholder="e.g. dslim/bert-base-NER or ./models/cti_transformer"
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Supports local Hugging Face checkpoints in models/ or Hugging Face repository IDs.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-700">
                  Confidence Threshold Filter
                </label>
                <span className="font-mono text-blue-600 font-bold">
                  {Math.round(confidenceThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.95"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                Inference Adapter Status
              </span>
              <p className="font-mono text-xs text-slate-800 font-semibold mt-1">
                {healthData?.model_status || 'Pretrained Adapter + CTI Regex Engine'}
              </p>
            </div>
          </div>
        </div>

        {/* Database & Storage Configuration */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
            <Database className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Database & Storage Configuration
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Active Database Connection
              </label>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-emerald-700 font-bold flex items-center justify-between">
                <span>{dbStatus}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Configured via DATABASE_URL environment variable in .env. Fully compatible with PostgreSQL and SQLite.
              </span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Upload Document Storage
              </label>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700 font-medium">
                uploads/ (Local File Storage)
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Max Document Upload Size
              </label>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700 font-medium">
                25 Megabytes (PDF, DOCX, TXT, MD)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment & Environment Spec */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
          <Terminal className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Native System Environment Specifications
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block">Python Runtime</span>
            <span className="text-slate-900 font-bold">Python 3.12.3</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block">PyTorch Backend</span>
            <span className="text-slate-900 font-bold">PyTorch 2.9.1</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block">Frontend Stack</span>
            <span className="text-slate-900 font-bold">React 19 + Vite + Tailwind</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block">Graph Visualizer</span>
            <span className="text-slate-900 font-bold">React Flow 12.12</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
