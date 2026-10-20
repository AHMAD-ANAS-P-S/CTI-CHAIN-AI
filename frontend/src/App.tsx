import React, { useState, useCallback } from 'react';
import {
  Shield,
  UploadCloud,
  Network,
  FileText,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { CyberNetworkBackground } from './components/CyberNetworkBackground';
import { ReportUploadDashboard } from './features/report-upload/ReportUploadDashboard';
import { AttackChainDashboard } from './features/attack-graph/AttackChainDashboard';
import { AttackDetailsDashboard } from './features/details-download/AttackDetailsDashboard';
import { ReportItem, AttackGraphResponse } from './types';

export type DashboardTab = 'upload' | 'attack-chain' | 'details';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('upload');
  // Initial state is strictly null: NO automatic loading, NO auto-analysis of report 1 or previous report
  const [currentReport, setCurrentReport] = useState<ReportItem | null>(null);
  const [graphData, setGraphData] = useState<AttackGraphResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Clear previous analysis results when input changes or user starts a new analysis
  const handleClearPreviousAnalysis = useCallback(() => {
    setCurrentReport(null);
    setGraphData(null);
  }, []);

  // When explicit analysis completes for the chosen report
  const handleAnalysisComplete = useCallback((report: ReportItem, graph: AttackGraphResponse) => {
    setCurrentReport(report);
    setGraphData(graph);
    setActiveTab('attack-chain');
  }, []);

  return (
    <div className="min-h-screen bg-[#001314] text-[#E6FFFF] flex flex-col font-sans relative selection:bg-[#00E5F0] selection:text-[#001314]">
      {/* Full-Screen Cybersecurity Network Background */}
      <CyberNetworkBackground />

      {/* Top Application Header with Minimal Step Navigation */}
      <header className="sticky top-0 z-40 bg-[#00191B]/90 backdrop-blur-md border-b border-[#12494D] shadow-lg shadow-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand & Logo */}
          <div
            onClick={() => {
              setActiveTab('upload');
            }}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00C9D4] to-[#087F88] text-[#001314] flex items-center justify-center shadow-md shadow-[#00E5F0]/25 group-hover:scale-105 group-hover:shadow-[#00E5F0]/40 transition-all">
              <Shield className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#E6FFFF] group-hover:text-[#00E5F0] transition-colors">
                  CTI Attack-Chain Analyzer
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#002629] text-[#00E5F0] border border-[#087F88]">
                  v2.0
                </span>
              </div>
              <p className="text-[10px] text-[#9CBFC2] hidden sm:block">
                Transformer-Based Threat Intelligence Platform
              </p>
            </div>
          </div>

          {/* Minimal 3-Step Navigation Indicator */}
          <nav className="flex items-center bg-[#001B1D]/90 p-1 rounded-xl border border-[#12494D] shadow-inner">
            {/* Step 1: Upload Report */}
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'upload'
                  ? 'bg-[#002629] text-[#00E5F0] border border-[#087F88] shadow-xs'
                  : 'text-[#9CBFC2] hover:text-[#E6FFFF] hover:bg-[#002629]/60'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  activeTab === 'upload'
                    ? 'bg-[#00C9D4] text-[#001314]'
                    : 'bg-[#002629] text-[#9CBFC2] border border-[#12494D]'
                }`}
              >
                1
              </span>
              <span className="hidden sm:inline">Upload Report</span>
              <UploadCloud className="w-3.5 h-3.5 sm:hidden" />
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-[#087F88] mx-0.5" />

            {/* Step 2: Attack Chain */}
            <button
              onClick={() => {
                if (currentReport && graphData) setActiveTab('attack-chain');
              }}
              disabled={!currentReport || !graphData}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-35 disabled:cursor-not-allowed ${
                activeTab === 'attack-chain'
                  ? 'bg-[#002629] text-[#00E5F0] border border-[#087F88] shadow-xs'
                  : 'text-[#9CBFC2] hover:text-[#E6FFFF] hover:bg-[#002629]/60'
              }`}
              title={!currentReport || !graphData ? 'Analyze a report first' : 'View Attack Chain'}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  activeTab === 'attack-chain'
                    ? 'bg-[#00C9D4] text-[#001314]'
                    : 'bg-[#002629] text-[#9CBFC2] border border-[#12494D]'
                }`}
              >
                2
              </span>
              <span className="hidden sm:inline">Attack Chain</span>
              <Network className="w-3.5 h-3.5 sm:hidden" />
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-[#087F88] mx-0.5" />

            {/* Step 3: Details & Download */}
            <button
              onClick={() => {
                if (currentReport && graphData) setActiveTab('details');
              }}
              disabled={!currentReport || !graphData}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-35 disabled:cursor-not-allowed ${
                activeTab === 'details'
                  ? 'bg-[#002629] text-[#00E5F0] border border-[#087F88] shadow-xs'
                  : 'text-[#9CBFC2] hover:text-[#E6FFFF] hover:bg-[#002629]/60'
              }`}
              title={!currentReport || !graphData ? 'Analyze a report first' : 'View Details & Download'}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  activeTab === 'details'
                    ? 'bg-[#00C9D4] text-[#001314]'
                    : 'bg-[#002629] text-[#9CBFC2] border border-[#12494D]'
                }`}
              >
                3
              </span>
              <span className="hidden sm:inline">Details & Download</span>
              <FileText className="w-3.5 h-3.5 sm:hidden" />
            </button>
          </nav>

          {/* Right Header Status / New Report Button */}
          <div className="flex items-center gap-3">
            {currentReport && graphData && (
              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#001B1D] border border-[#12494D] text-xs">
                <span className="w-2 h-2 rounded-full bg-[#00E5F0] shadow-[0_0_8px_#00E5F0] animate-pulse" />
                <span className="text-[#9CBFC2] truncate max-w-[160px]" title={currentReport.original_filename}>
                  {currentReport.original_filename}
                </span>
              </div>
            )}

            <button
              onClick={() => {
                handleClearPreviousAnalysis();
                setActiveTab('upload');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-[#E6FFFF] bg-[#002629] hover:bg-[#00353A] rounded-lg border border-[#12494D] hover:border-[#087F88] flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#00C9D4]" />
              <span className="hidden sm:inline">New Analysis</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Router (Strictly 3 Dashboards) */}
      <main className="flex-1 w-full flex flex-col relative z-10">
        {activeTab === 'upload' && (
          <ReportUploadDashboard
            onAnalysisComplete={handleAnalysisComplete}
            onInputChanged={handleClearPreviousAnalysis}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}

        {activeTab === 'attack-chain' && (
          <AttackChainDashboard
            currentReport={currentReport}
            graphData={graphData}
            isLoading={isLoading}
            onNavigateToDetails={() => setActiveTab('details')}
            onNavigateToUpload={() => setActiveTab('upload')}
          />
        )}

        {activeTab === 'details' && (
          <AttackDetailsDashboard
            currentReport={currentReport}
            graphData={graphData}
            onNavigateToGraph={() => setActiveTab('attack-chain')}
            onNavigateToUpload={() => setActiveTab('upload')}
          />
        )}
      </main>
    </div>
  );
};

export default App;
