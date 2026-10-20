import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  FileCheck,
  AlertCircle,
  Play,
  RotateCw,
  Download,
  Eye,
  X
} from 'lucide-react';
import { reportApi } from '../../services/api';
import { BuiltinReportInfo, ReportItem } from '../../types';

interface ReportUploadViewProps {
  onReportAnalyzed: (report: ReportItem) => void;
  onSelectReport: (report: ReportItem) => void;
}

export const ReportUploadView: React.FC<ReportUploadViewProps> = ({
  onReportAnalyzed,
  onSelectReport,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedReport, setUploadedReport] = useState<ReportItem | null>(null);
  const [reportPreview, setReportPreview] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Built-in reports
  const [builtinReports, setBuiltinReports] = useState<BuiltinReportInfo[]>([]);
  const [previewModalContent, setPreviewModalContent] = useState<{
    title: string;
    filename: string;
    content: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBuiltinReports();
  }, []);

  const loadBuiltinReports = async () => {
    try {
      const data = await reportApi.getBuiltinReports();
      setBuiltinReports(data);
    } catch (e) {
      console.error('Failed to load built-in reports', e);
    }
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
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    const validExtensions = ['.pdf', '.docx', '.txt', '.md'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setErrorMsg(
        `Invalid file type "${fileExt}". Please upload a PDF, DOCX, TXT, or MD report.`
      );
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('File exceeds 25MB upload limit.');
      return;
    }

    // Read preview text if TXT or MD
    if (['.txt', '.md'].includes(fileExt)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setReportPreview(e.target?.result as string);
      };
      reader.readAsText(file);
    } else {
      setReportPreview(`[Binary ${fileExt.toUpperCase()} Document: Text will be extracted by parser upon upload]`);
    }

    // Automatically upload to server
    try {
      const rep = await reportApi.uploadReport(file);
      setUploadedReport(rep);
      onSelectReport(rep);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to upload document.');
    }
  };

  const handleAnalyze = async () => {
    if (!uploadedReport) return;
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      await reportApi.analyzeReport(uploadedReport.id);
      const updated = await reportApi.getReport(uploadedReport.id);
      onReportAnalyzed(updated);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Analysis pipeline failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Builtin report actions
  const handleLoadAndAnalyzeBuiltin = async (filename: string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const rep = await reportApi.loadBuiltinReport(filename);
      onSelectReport(rep);
      await reportApi.analyzeReport(rep.id);
      const updated = await reportApi.getReport(rep.id);
      onReportAnalyzed(updated);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to load and analyze built-in scenario.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleViewBuiltin = async (reportInfo: BuiltinReportInfo) => {
    try {
      const res = await fetch(`/api/reports/builtin/${reportInfo.filename}/download`);
      const text = await res.text();
      setPreviewModalContent({
        title: reportInfo.title,
        filename: reportInfo.filename,
        content: text,
      });
    } catch (err) {
      setErrorMsg('Could not load report content preview.');
    }
  };

  const handleDownloadBuiltin = (filename: string) => {
    window.open(`/api/reports/builtin/${filename}/download`, '_blank');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Title Header */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Upload Cyber Threat Intelligence (CTI) Report
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Submit unstructured security telemetry reports in PDF, DOCX, TXT, or Markdown format for Transformer-based entity extraction and attack-chain reconstruction.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">Processing Error</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Upload Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer ${
            dragActive
              ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-500/10'
              : 'border-slate-300 hover:border-blue-500 bg-white shadow-xs'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.doc,.txt,.md"
            onChange={handleFileInputChange}
          />
          <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
            <UploadCloud className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-slate-900">
            Click to upload or drag & drop CTI document
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Supports PDF, DOCX, TXT, or Markdown (up to 25MB)
          </p>
        </div>

        {/* Uploaded File Details & Analysis Controls */}
        {uploadedReport && (
          <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-3">
                <FileCheck className="w-6 h-6 text-emerald-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {uploadedReport.original_filename}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Format: {uploadedReport.file_type.toUpperCase()} | Size:{' '}
                    {(uploadedReport.file_size / 1024).toFixed(1)} KB | Status:{' '}
                    <span className="text-blue-600 font-semibold">{uploadedReport.status}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold tracking-wide transition shadow-sm ${
                  isAnalyzing
                    ? 'bg-blue-50 text-blue-500 border border-blue-200 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Executing Pipeline (Stage 1 to 4)...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Analyze Report</span>
                  </>
                )}
              </button>
            </div>

            {/* Document Preview Box */}
            {reportPreview && (
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Document Preview
                </span>
                <pre className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {reportPreview}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Built-in Synthetic CTI Scenarios Section */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Built-in Benchmark CTI Reports</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Five complete, technically coherent security analysis scenarios for testing extraction and graph reconstruction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {builtinReports.map((b, idx) => (
              <div
                key={b.filename}
                className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between space-y-3 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                      Scenario #{idx + 1}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      {b.file_type}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{b.title}</h4>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-2">
                    {b.description}
                  </p>
                </div>

                <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleViewBuiltin(b)}
                    className="flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>View</span>
                  </button>

                  <button
                    onClick={() => handleDownloadBuiltin(b.filename)}
                    className="flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={() => handleLoadAndAnalyzeBuiltin(b.filename)}
                    className="flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Analyze</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal for Report View */}
        {previewModalContent && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-6">
            <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {previewModalContent.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {previewModalContent.filename}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewModalContent(null)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed p-4 bg-white border border-slate-200 rounded-lg shadow-xs">
                  {previewModalContent.content}
                </pre>
              </div>

              <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3">
                <button
                  onClick={() => handleDownloadBuiltin(previewModalContent.filename)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-700 hover:text-slate-900 hover:border-slate-400 font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download .txt</span>
                </button>
                <button
                  onClick={() => {
                    const fn = previewModalContent.filename;
                    setPreviewModalContent(null);
                    handleLoadAndAnalyzeBuiltin(fn);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Analyze Report</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
