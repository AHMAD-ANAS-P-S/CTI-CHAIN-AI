import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  AlertCircle,
  Loader2,
  ArrowRight,
  Shield,
  FileCheck,
  FileCode,
  Sparkles,
  Download,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { reportApi } from '../../services/api';
import { ReportItem, BuiltinReportInfo, AttackGraphResponse } from '../../types';

interface ReportUploadDashboardProps {
  onAnalysisComplete: (report: ReportItem, graph: AttackGraphResponse) => void;
  onInputChanged: () => void;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const FALLBACK_BUILTIN_REPORTS: BuiltinReportInfo[] = [
  {
    filename: 'cti_report_01_phishing_powershell.txt',
    title: 'Phishing Campaign Delivering a Malicious Payload',
    scenario: 'Phishing Email and PowerShell-Based Malware Delivery',
    description: 'Enterprise investigation involving phishing link, malicious attachment, PowerShell execution, registry persistence, scheduled tasks, and C2 domain.',
    file_type: 'txt',
  },
  {
    filename: 'cti_report_02_office_document.txt',
    title: 'Suspicious Office Document Leading to Script-Based Execution',
    scenario: 'Malicious Office Document and Script Execution',
    description: 'Macro-enabled Word document invoking wscript/cscript child processes, dropping VBS script, and querying outbound staging infrastructure.',
    file_type: 'txt',
  },
  {
    filename: 'cti_report_03_web_exploitation.txt',
    title: 'Suspicious Requests Against a Public-Facing Web Application',
    scenario: 'Exploitation of a Public-Facing Application',
    description: 'Targeted HTTP exploitation of web server upload handler resulting in webshell dropping and unconfirmed outbound connection.',
    file_type: 'txt',
  },
  {
    filename: 'cti_report_04_ransomware_activity.txt',
    title: 'Endpoint Investigation of Suspicious File Modification',
    scenario: 'Ransomware Preparation and Impact',
    description: 'Finance workstation alert involving document encryption, vssadmin shadow copy deletion attempt, and ransom note generation.',
    file_type: 'txt',
  },
  {
    filename: 'cti_report_05_remote_access.txt',
    title: 'Investigation of Unusual Remote Access and Data Transfer',
    scenario: 'Suspicious Remote Access and Possible Data Exfiltration',
    description: 'Abnormal off-hours credential access, PowerShell archive creation, and subsequent 120MB outbound data transmission.',
    file_type: 'txt',
  },
];

const ANALYSIS_STAGES = [
  'Extracting document text and structural tokens...',
  'Running Transformer-based threat entity extraction (CTI-BERT)...',
  'Extracting contextual relationships and attack links...',
  'Reconstructing sequential attack chain and DAG topology...',
  'Compiling interactive attack graph and MITRE intelligence...',
];

export const ReportUploadDashboard: React.FC<ReportUploadDashboardProps> = ({
  onAnalysisComplete,
  onInputChanged,
  isLoading,
  setIsLoading,
}) => {
  const [builtinReports, setBuiltinReports] = useState<BuiltinReportInfo[]>(FALLBACK_BUILTIN_REPORTS);
  const [selectedBuiltin, setSelectedBuiltin] = useState<BuiltinReportInfo | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load builtin reports metadata from backend
  useEffect(() => {
    reportApi
      .getBuiltinReports()
      .then((data) => {
        if (data && data.length > 0) {
          setBuiltinReports(data);
        }
      })
      .catch(() => {
        setBuiltinReports(FALLBACK_BUILTIN_REPORTS);
      });
  }, []);

  // Analysis stage progress simulation while waiting for API
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading) {
      setCurrentStageIdx(0);
      interval = setInterval(() => {
        setCurrentStageIdx((prev) => (prev < ANALYSIS_STAGES.length - 1 ? prev + 1 : prev));
      }, 900);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // When user selects a built-in report
  const handleSelectBuiltin = (rep: BuiltinReportInfo) => {
    if (isLoading) return;
    setErrorMsg(null);
    setSelectedBuiltin(rep);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onInputChanged(); // Clears any previous graph and results
  };

  // When user selects a custom file
  const handleFileSelected = (file: File) => {
    if (isLoading) return;
    setErrorMsg(null);
    const validExts = ['.pdf', '.docx', '.txt', '.md'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExts.some((ext) => lowerName.endsWith(ext));

    if (!isValid) {
      setErrorMsg('Invalid file format. Please upload a PDF, DOCX, TXT, or MD report.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('File exceeds 20MB limit. Please upload a smaller CTI report.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setSelectedBuiltin(null);
    onInputChanged(); // Clears any previous graph and results
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  // Download raw builtin report text file
  const handleDownloadBuiltinRaw = (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/api/reports/builtin/${filename}/download`, '_blank');
  };

  // Trigger analysis on ONLY the selected report
  const handleAnalyzeSelectedReport = async () => {
    if (!selectedFile && !selectedBuiltin) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      let targetReportId = '';

      if (selectedBuiltin) {
        // 1. Load the selected built-in report
        const loaded = await reportApi.loadBuiltinReport(selectedBuiltin.filename);
        targetReportId = loaded.id;
      } else if (selectedFile) {
        // 1. Upload custom report
        const uploaded = await reportApi.uploadReport(selectedFile);
        targetReportId = uploaded.id;
      }

      // 2. Trigger Transformer and relationship analysis pipeline on ONLY this report
      await reportApi.analyzeReport(targetReportId);

      // 3. Fetch fresh report record and newly reconstructed attack graph
      const freshReport = await reportApi.getReport(targetReportId);
      const freshGraph = await reportApi.getAttackGraph(targetReportId);

      // 4. Update parent state and navigate to Dashboard 2
      onAnalysisComplete(freshReport, freshGraph);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setErrorMsg(
        e.response?.data?.detail || e.message || 'Analysis pipeline encountered an error. Please verify the report.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const activeSelectionLabel = selectedBuiltin
    ? selectedBuiltin.title
    : selectedFile
    ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})`
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Dashboard Title & Purpose */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#002629]/90 border border-[#087F88] text-[#00E5F0] text-xs font-semibold shadow-xs">
          <Shield className="w-3.5 h-3.5 text-[#00C9D4]" />
          Dashboard 1 — Threat Intelligence Ingestion
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#E6FFFF] tracking-tight">
          CTI Attack-Chain Analyzer
        </h1>
        <p className="text-base text-[#9CBFC2] max-w-2xl mx-auto font-normal">
          Select one of the 5 benchmark CTI reports below or upload your own report to reconstruct its dedicated attack chain.
        </p>
      </div>

      {/* SECTION 1: Drag & Drop Custom Upload Area */}
      <div className="bg-[#001B1D]/90 backdrop-blur-md rounded-2xl border border-[#12494D] shadow-xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#12494D]">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#00C9D4]" />
            <h2 className="text-sm font-bold text-[#E6FFFF] uppercase tracking-wider">
              Option A: Upload Custom CTI Report
            </h2>
          </div>
          <span className="text-[11px] text-[#9CBFC2] font-mono">
            PDF, DOCX, TXT, MD (Max 20MB)
          </span>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !isLoading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
            dragActive
              ? 'border-[#00E5F0] bg-[#002629]/80 shadow-[0_0_24px_rgba(0,229,240,0.25)]'
              : selectedFile
              ? 'border-[#00E5F0] bg-[#002629]/50 shadow-[0_0_16px_rgba(0,229,240,0.2)]'
              : 'border-[#12494D] bg-[#001416]/50 hover:border-[#087F88] hover:bg-[#002225]/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading}
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                selectedFile
                  ? 'bg-[#00383D] text-[#00E5F0] border border-[#00C9D4] shadow-md shadow-[#00E5F0]/20'
                  : 'bg-[#002629] text-[#00C9D4] border border-[#087F88]'
              }`}
            >
              {selectedFile ? (
                <FileCheck className="w-7 h-7" />
              ) : (
                <UploadCloud className="w-7 h-7" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#E6FFFF]">
                {selectedFile ? 'Selected Upload File' : 'Drag & drop your CTI security report here'}
              </p>
              <p className="text-xs text-[#9CBFC2]">
                {selectedFile
                  ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})`
                  : 'Supports unstructured security incident reports'}
              </p>
            </div>

            {!selectedFile ? (
              <button
                type="button"
                className="mt-2 px-4 py-2 bg-[#002629] border border-[#087F88] hover:bg-[#00353A] hover:border-[#00C9D4] text-[#E6FFFF] text-xs font-semibold rounded-lg shadow-xs transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Browse Files
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  onInputChanged();
                }}
                disabled={isLoading}
                className="text-xs text-[#9CBFC2] hover:text-[#E52535] underline font-medium"
              >
                Clear uploaded file
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: Five Optional Built-in Benchmark Reports */}
      <div className="bg-[#001B1D]/90 backdrop-blur-md rounded-2xl border border-[#12494D] shadow-xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#12494D]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#00C9D4]" />
            <h2 className="text-sm font-bold text-[#E6FFFF] uppercase tracking-wider">
              Option B: Or Select from 5 Built-in CTI Benchmark Scenarios
            </h2>
          </div>
          <span className="text-[11px] text-[#9CBFC2] font-mono">
            5 Verified Threat Reports Available
          </span>
        </div>

        <p className="text-xs text-[#9CBFC2]">
          Click any report card below to select it for analysis. You can also download the raw report text.
        </p>

        {/* 5 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {builtinReports.map((report, idx) => {
            const isSelected = selectedBuiltin?.filename === report.filename;
            return (
              <div
                key={report.filename}
                onClick={() => handleSelectBuiltin(report)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'border-[#00E5F0] bg-[#002629] shadow-[0_0_18px_rgba(0,229,240,0.25)] ring-2 ring-[#00E5F0]/20'
                    : 'border-[#12494D] bg-[#001416]/70 hover:border-[#087F88] hover:bg-[#002225]/60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        isSelected
                          ? 'bg-[#00383D] text-[#00E5F0] border-[#00C9D4]'
                          : 'bg-[#002629] text-[#00C9D4] border-[#087F88]'
                      }`}
                    >
                      Scenario 0{idx + 1}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[#00E5F0]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Selected
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-[#E6FFFF] leading-snug line-clamp-2" title={report.title}>
                    {report.title}
                  </h3>

                  <p className="text-[11px] text-[#9CBFC2] leading-relaxed line-clamp-3">
                    {report.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#12494D]/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectBuiltin(report);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                      isSelected
                        ? 'bg-[#00C9D4] text-[#001314] font-bold shadow-xs'
                        : 'bg-[#002629] text-[#E6FFFF] hover:bg-[#00353A] border border-[#12494D]'
                    }`}
                  >
                    {isSelected ? 'Selected Input' : 'Select Report'}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDownloadBuiltinRaw(report.filename, e)}
                    title="Download raw CTI report text"
                    className="p-1.5 text-[#9CBFC2] hover:text-[#00E5F0] hover:bg-[#002629] rounded border border-transparent hover:border-[#12494D] transition-colors flex items-center gap-1 text-[10px]"
                  >
                    <Download className="w-3 h-3 text-[#00C9D4]" />
                    Raw Text
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Active Selection & Single Unified "Analyze Report" Trigger */}
      <div className="bg-[#001B1D]/95 backdrop-blur-md rounded-2xl border border-[#12494D] shadow-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#12494D]">
          <div>
            <span className="text-[10px] font-semibold text-[#548286] uppercase tracking-wider block leading-none">
              Active Input Status
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  activeSelectionLabel ? 'bg-[#00E5F0] shadow-[0_0_8px_#00E5F0]' : 'bg-slate-600'
                }`}
              />
              <span className="text-xs font-bold text-[#E6FFFF] truncate max-w-md">
                {activeSelectionLabel || 'No report selected yet'}
              </span>
            </div>
          </div>

          {activeSelectionLabel && (
            <button
              type="button"
              onClick={() => {
                setSelectedBuiltin(null);
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                onInputChanged();
              }}
              disabled={isLoading}
              className="text-xs text-[#9CBFC2] hover:text-[#E52535] underline self-start sm:self-center"
            >
              Clear Selection
            </button>
          )}
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="flex items-start gap-3 p-4 bg-[#290005]/85 border border-[#E52535] text-[#FFB3BA] rounded-xl text-sm">
            <AlertCircle className="w-5 h-5 text-[#E52535] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-[#FFEAEA]">Unable to analyze document</p>
              <p className="text-xs text-[#FFB3BA]">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Loading Progress State */}
        {isLoading && (
          <div className="p-5 bg-[#002629]/80 border border-[#087F88] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#00E5F0]">
                <Loader2 className="w-4 h-4 text-[#00C9D4] animate-spin" />
                <span>Reconstructing Attack Chain for Selected Report...</span>
              </div>
              <span className="text-xs font-mono font-semibold text-[#00C9D4]">
                Stage {currentStageIdx + 1} of {ANALYSIS_STAGES.length}
              </span>
            </div>

            <p className="text-xs text-[#9CBFC2] italic">
              {ANALYSIS_STAGES[currentStageIdx]}
            </p>

            <div className="w-full bg-[#001314] rounded-full h-1.5 overflow-hidden border border-[#12494D]">
              <div
                className="bg-gradient-to-r from-[#087F88] to-[#00E5F0] h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_#00E5F0]"
                style={{
                  width: `${((currentStageIdx + 1) / ANALYSIS_STAGES.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* The Primary Analyze Button */}
        <button
          type="button"
          disabled={!activeSelectionLabel || isLoading}
          onClick={handleAnalyzeSelectedReport}
          className={`w-full py-4 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 shadow-md ${
            !activeSelectionLabel || isLoading
              ? 'bg-[#002629] text-[#548286] cursor-not-allowed border border-[#12494D]'
              : 'bg-[#00C9D4] hover:bg-[#00E5F0] text-[#001314] shadow-[#00C9D4]/25 hover:shadow-[0_0_20px_rgba(0,229,240,0.4)] cursor-pointer'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#001314]" />
              Analyzing Selected Report & Reconstructing Chain...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>
                {selectedBuiltin
                  ? `Analyze Selected Report (${selectedBuiltin.scenario})`
                  : selectedFile
                  ? `Analyze Uploaded Report (${selectedFile.name})`
                  : 'Select or Upload a CTI Report to Begin'}
              </span>
              {activeSelectionLabel && <ArrowRight className="w-4 h-4" />}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
