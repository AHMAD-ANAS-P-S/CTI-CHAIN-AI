import React from 'react';
import {
  Play,
  RotateCw,
  Cpu,
  GitBranch,
  AlertTriangle
} from 'lucide-react';
import { ModelEvaluationData } from '../../types';

interface ModelEvaluationViewProps {
  evaluation: ModelEvaluationData | null;
  isLoading: boolean;
  onRunEvaluation: () => void;
  isEvaluating: boolean;
}

export const ModelEvaluationView: React.FC<ModelEvaluationViewProps> = ({
  evaluation,
  isLoading,
  onRunEvaluation,
  isEvaluating,
}) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-3" />
        <p className="text-xs font-mono">Loading Model Evaluation Metrics...</p>
      </div>
    );
  }

  const hasData = evaluation && evaluation.has_ground_truth;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 space-y-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Transformer & Model Evaluation Workbench
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Empirical benchmark comparing model extraction results against annotated ground-truth CTI scenarios.
          </p>
        </div>

        <button
          onClick={onRunEvaluation}
          disabled={isEvaluating}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition shadow-xs ${
            isEvaluating
              ? 'bg-purple-50 text-purple-600 border border-purple-200 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20'
          }`}
        >
          {isEvaluating ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Running Evaluation...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Run Ground-Truth Evaluation</span>
            </>
          )}
        </button>
      </div>

      {/* Model Spec Card */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-[10px] text-slate-500 font-semibold uppercase block">Active Model Engine</span>
          <p className="font-mono text-slate-900 font-bold mt-0.5">
            {evaluation?.model_name || 'dslim/bert-base-NER'}
          </p>
          <span className="text-[10px] text-purple-700 font-mono font-medium">
            {evaluation?.model_status || 'Pretrained Adapter + CTI Engine'}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 font-semibold uppercase block">Engine Architecture</span>
          <p className="font-mono text-slate-900 font-bold mt-0.5">
            Transformer Token-Classification
          </p>
          <span className="text-[10px] text-slate-500 font-mono">PyTorch / Hugging Face</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 font-semibold uppercase block">Benchmark Corpus</span>
          <p className="font-mono text-slate-900 font-bold mt-0.5">
            {evaluation?.evaluation_dataset_size ?? 5} Annotated Scenarios
          </p>
          <span className="text-[10px] text-emerald-700 font-mono font-semibold">Gold Standard GT</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 font-semibold uppercase block">Inference Speed</span>
          <p className="font-mono text-slate-900 font-bold mt-0.5">
            {evaluation?.inference_time_ms ? `${evaluation.inference_time_ms} ms` : 'N/A'}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">End-to-end Pipeline</span>
        </div>
      </div>

      {!hasData ? (
        <div className="p-12 rounded-xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">
            Ground-Truth Dataset Required for Evaluation
          </h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
            {evaluation?.message ||
              'Evaluation metrics require labeled gold-standard reports at data/evaluation/ground_truth.json. Empirical precision, recall, and F1 are never fabricated.'}
          </p>
        </div>
      ) : (
        <>
          {/* High Level Entity & Relationship Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entity Metrics */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Threat Entity Extraction Metrics
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  Support: {evaluation.entity_metrics?.support}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Precision</span>
                  <p className="text-2xl font-bold font-mono text-blue-600 mt-1">
                    {Math.round((evaluation.entity_metrics?.precision || 0) * 100)}%
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Recall</span>
                  <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                    {Math.round((evaluation.entity_metrics?.recall || 0) * 100)}%
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">F1 Score</span>
                  <p className="text-2xl font-bold font-mono text-purple-600 mt-1">
                    {Math.round((evaluation.entity_metrics?.f1 || 0) * 100)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Relationship Metrics */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center space-x-2">
                  <GitBranch className="w-5 h-5 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Relationship Extraction Metrics
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  Support: {evaluation.relationship_metrics?.support}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Precision</span>
                  <p className="text-2xl font-bold font-mono text-blue-600 mt-1">
                    {Math.round((evaluation.relationship_metrics?.precision || 0) * 100)}%
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Recall</span>
                  <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                    {Math.round((evaluation.relationship_metrics?.recall || 0) * 100)}%
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">F1 Score</span>
                  <p className="text-2xl font-bold font-mono text-purple-600 mt-1">
                    {Math.round((evaluation.relationship_metrics?.f1 || 0) * 100)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Per-Class Metrics Table */}
          {evaluation.per_class_metrics && (
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Per-Entity-Class Evaluation Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Entity Class</th>
                      <th className="py-2.5 px-3">Precision</th>
                      <th className="py-2.5 px-3">Recall</th>
                      <th className="py-2.5 px-3">F1 Score</th>
                      <th className="py-2.5 px-3">Ground Truth Support</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Object.entries(evaluation.per_class_metrics).map(([cls, m]) => (
                      <tr key={cls} className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3 font-mono text-blue-700 font-bold">
                          {cls}
                        </td>
                        <td className="py-2 px-3 font-mono">
                          {Math.round(m.precision * 100)}%
                        </td>
                        <td className="py-2 px-3 font-mono">
                          {Math.round(m.recall * 100)}%
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {Math.round(m.f1 * 100)}%
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500">
                          {m.support}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Confusion Matrix Visualization */}
          {evaluation.confusion_matrix && Object.keys(evaluation.confusion_matrix).length > 0 && (
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Entity Classification Confusion Matrix
              </h3>
              <p className="text-[11px] text-slate-500">
                Rows represent annotated ground-truth labels; columns represent model predictions.
              </p>
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-center text-xs font-mono text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-left">Ground Truth \ Pred</th>
                      {Object.keys(evaluation.confusion_matrix).map((k) => (
                        <th key={k} className="py-2 px-2">
                          {k.slice(0, 6)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Object.entries(evaluation.confusion_matrix).map(([gtKey, predDict]) => (
                      <tr key={gtKey} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-left font-bold text-slate-900">
                          {gtKey}
                        </td>
                        {Object.keys(evaluation.confusion_matrix!).map((colKey) => {
                          const count = predDict[colKey] || 0;
                          const isDiagonal = gtKey === colKey;
                          return (
                            <td
                              key={colKey}
                              className={`py-2 px-2 font-medium ${
                                isDiagonal && count > 0
                                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                                  : count > 0
                                  ? 'bg-rose-50 text-rose-700 font-bold'
                                  : 'text-slate-300'
                              }`}
                            >
                              {count}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
