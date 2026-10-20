export interface ExtractedEntity {
  id: string;
  report_id: string;
  entity_type: string;
  normalized_value: string;
  original_value: string;
  confidence_score: number;
  evidence_sentence?: string;
  paragraph_index: number;
  document_location?: { start: number; end: number };
  attack_stage?: string;
  extraction_method?: string;
  created_at?: string;
}

export interface ExtractedRelationship {
  id: string;
  report_id: string;
  source_entity_id: string;
  target_entity_id: string;
  source_label: string;
  target_label: string;
  relationship_type: string;
  evidence_sentence?: string;
  confidence_score: number;
  classification: 'observed' | 'inferred';
  validation_status: 'unreviewed' | 'confirmed' | 'rejected' | 'uncertain';
  analyst_notes?: string;
  created_at?: string;
}

export interface AttackGraphNodeData extends Record<string, unknown> {
  id: string;
  label: string;
  full_name: string;
  entity_type: string;
  stage: string;
  confidence: number;
  evidence?: string;
  paragraph_index: number;
  color: string;
  icon: string;
  extraction_method?: string;
}

export interface AttackGraphEdgeData extends Record<string, unknown> {
  id: string;
  relationship_type: string;
  label: string;
  evidence?: string;
  confidence: number;
  classification: 'observed' | 'inferred';
  validation_status: 'unreviewed' | 'confirmed' | 'rejected' | 'uncertain';
  source_name: string;
  target_name: string;
}

export interface AttackGraphResponse {
  report_id: string;
  nodes: {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: AttackGraphNodeData;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label: string;
    type: string;
    animated?: boolean;
    data: AttackGraphEdgeData;
  }[];
  stages: string[];
  connected_components_count: number;
  detected_cycles_count: number;
  unresolved_relationships_count: number;
  created_at?: string;
}

export interface IndicatorOfCompromise {
  id: string;
  report_id: string;
  ioc_type: string;
  value: string;
  verification_status: string;
  evidence_sentence?: string;
  is_defanged: boolean;
  created_at?: string;
}

export interface MITREMapping {
  id: string;
  report_id: string;
  technique_id: string;
  technique_name: string;
  tactic: string;
  evidence_sentence?: string;
  confidence_score: number;
  mapping_method: string;
  url?: string;
  created_at?: string;
}

export interface ReportItem {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  title?: string;
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'failed';
  created_at: string;
  updated_at: string;
  content_snippet?: string;
  total_entities?: number;
  total_relationships?: number;
}

export interface BuiltinReportInfo {
  filename: string;
  title: string;
  scenario: string;
  description: string;
  file_type: string;
}

export interface DashboardStats {
  total_reports: number;
  total_entities: number;
  total_relationships: number;
  total_attack_chains: number;
  total_iocs: number;
  total_mitre_techniques: number;
  entity_distribution: Record<string, number>;
  stage_distribution: Record<string, number>;
  recent_investigations: {
    id: string;
    filename: string;
    status: string;
    created_at: string;
    total_entities: number;
    total_relationships: number;
  }[];
}

export interface ModelEvaluationData {
  has_ground_truth: boolean;
  message?: string;
  model_name?: string;
  model_version?: string;
  checkpoint_path?: string;
  model_status?: string;
  evaluation_dataset_size?: number;
  entity_metrics?: {
    precision: number;
    recall: number;
    f1: number;
    support: number;
  };
  relationship_metrics?: {
    precision: number;
    recall: number;
    f1: number;
    support: number;
  };
  per_class_metrics?: Record<string, {
    precision: number;
    recall: number;
    f1: number;
    support: number;
  }>;
  confusion_matrix?: Record<string, Record<string, number>>;
  inference_time_ms?: number;
  evaluated_at?: string;
}
