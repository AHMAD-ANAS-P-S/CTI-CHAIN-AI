import axios from 'axios';
import {
  ReportItem,
  ExtractedEntity,
  ExtractedRelationship,
  AttackGraphResponse,
  IndicatorOfCompromise,
  MITREMapping,
  DashboardStats,
  ModelEvaluationData,
  BuiltinReportInfo
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

export const reportApi = {
  getHealth: async () => {
    const res = await api.get('/health');
    return res.data;
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await api.get('/dashboard/stats');
    return res.data;
  },

  uploadReport: async (file: File): Promise<ReportItem> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/reports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  listReports: async (): Promise<ReportItem[]> => {
    const res = await api.get('/reports');
    return res.data;
  },

  getReport: async (reportId: string): Promise<ReportItem & { content: string }> => {
    const res = await api.get(`/reports/${reportId}`);
    return res.data;
  },

  analyzeReport: async (reportId: string) => {
    const res = await api.post(`/reports/${reportId}/analyze`);
    return res.data;
  },

  getEntities: async (reportId: string): Promise<ExtractedEntity[]> => {
    const res = await api.get(`/reports/${reportId}/entities`);
    return res.data;
  },

  getRelationships: async (reportId: string): Promise<ExtractedRelationship[]> => {
    const res = await api.get(`/reports/${reportId}/relationships`);
    return res.data;
  },

  updateRelationship: async (
    relationshipId: string,
    payload: {
      validation_status?: 'unreviewed' | 'confirmed' | 'rejected' | 'uncertain';
      relationship_type?: string;
      classification?: string;
      analyst_notes?: string;
    }
  ): Promise<ExtractedRelationship> => {
    const res = await api.patch(`/relationships/${relationshipId}`, payload);
    return res.data;
  },

  getAttackGraph: async (reportId: string): Promise<AttackGraphResponse> => {
    const res = await api.get(`/reports/${reportId}/attack-graph`);
    return res.data;
  },

  getIOCs: async (reportId: string): Promise<IndicatorOfCompromise[]> => {
    const res = await api.get(`/reports/${reportId}/iocs`);
    return res.data;
  },

  getMITRE: async (reportId: string): Promise<MITREMapping[]> => {
    const res = await api.get(`/reports/${reportId}/mitre`);
    return res.data;
  },

  deleteReport: async (reportId: string) => {
    const res = await api.delete(`/reports/${reportId}`);
    return res.data;
  },

  exportReport: async (reportId: string, format: 'json' | 'markdown' | 'pdf' = 'json') => {
    if (format === 'pdf') {
      const res = await api.get(`/reports/${reportId}/export?format=pdf`, {
        responseType: 'blob',
      });
      return res.data;
    }
    const res = await api.get(`/reports/${reportId}/export?format=${format}`);
    return res.data;
  },

  getBuiltinReports: async (): Promise<BuiltinReportInfo[]> => {
    const res = await api.get('/reports/builtin');
    return res.data;
  },

  loadBuiltinReport: async (filename: string): Promise<ReportItem> => {
    const res = await api.post(`/reports/builtin/${filename}/load`);
    return res.data;
  },

  getModelEvaluation: async (): Promise<ModelEvaluationData> => {
    const res = await api.get('/evaluation/metrics');
    return res.data;
  },

  runModelEvaluation: async (): Promise<ModelEvaluationData> => {
    const res = await api.post('/evaluation/run');
    return res.data;
  },
};

export default api;
