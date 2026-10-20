from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# Entity schemas
class ExtractedEntityBase(BaseModel):
    entity_type: str
    normalized_value: str
    original_value: str
    confidence_score: float = 1.0
    evidence_sentence: Optional[str] = None
    paragraph_index: int = 0
    document_location: Optional[Dict[str, Any]] = None
    attack_stage: Optional[str] = None

class ExtractedEntityResponse(ExtractedEntityBase):
    id: str
    report_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Relationship schemas
class ExtractedRelationshipBase(BaseModel):
    source_label: str
    target_label: str
    relationship_type: str
    evidence_sentence: Optional[str] = None
    confidence_score: float = 1.0
    classification: str = "observed"  # observed or inferred
    validation_status: str = "unreviewed"  # unreviewed, confirmed, rejected, uncertain
    analyst_notes: Optional[str] = None

class ExtractedRelationshipResponse(ExtractedRelationshipBase):
    id: str
    report_id: str
    source_entity_id: str
    target_entity_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class RelationshipUpdate(BaseModel):
    validation_status: Optional[str] = None  # confirmed, rejected, uncertain, unreviewed
    analyst_notes: Optional[str] = None
    relationship_type: Optional[str] = None
    classification: Optional[str] = None

# IOC schemas
class IOCResponse(BaseModel):
    id: str
    report_id: str
    ioc_type: str
    value: str
    verification_status: str
    evidence_sentence: Optional[str] = None
    is_defanged: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

# MITRE schemas
class MITREMappingResponse(BaseModel):
    id: str
    report_id: str
    technique_id: str
    technique_name: str
    tactic: str
    evidence_sentence: Optional[str] = None
    confidence_score: float = 0.9
    mapping_method: str = "Rule-Based Indicator"
    url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Attack Graph Flow schemas
class AttackGraphNode(BaseModel):
    id: str
    type: str = "ctiNode"
    position: Dict[str, float]
    data: Dict[str, Any]

class AttackGraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    type: str = "ctiEdge"
    animated: bool = False
    data: Dict[str, Any]

class AttackGraphResponse(BaseModel):
    report_id: str
    nodes: List[AttackGraphNode]
    edges: List[AttackGraphEdge]
    stages: List[str]
    connected_components_count: int
    detected_cycles_count: int
    unresolved_relationships_count: int
    created_at: Optional[datetime] = None

# Report Schemas
class ReportResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    title: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    content_snippet: Optional[str] = None
    total_entities: Optional[int] = 0
    total_relationships: Optional[int] = 0

    class Config:
        from_attributes = True

class ReportDetailResponse(ReportResponse):
    content: str
    entities: List[ExtractedEntityResponse] = []
    relationships: List[ExtractedRelationshipResponse] = []
    iocs: List[IOCResponse] = []
    mitre_mappings: List[MITREMappingResponse] = []

# Investigation Summary
class InvestigationSummary(BaseModel):
    report_id: str
    filename: str
    analysis_timestamp: datetime
    entity_counts_by_type: Dict[str, int]
    total_entities: int
    total_relationships: int
    connected_components: int
    reconstructed_stages: List[str]
    key_iocs: List[Dict[str, Any]]
    attack_sequence: List[Dict[str, Any]]
    uncertain_relationships: List[Dict[str, Any]]
    missing_information: List[str]
    mitre_mappings: List[Dict[str, Any]]
    analyst_recommendations: List[str]

# Dashboard Stats
class DashboardStats(BaseModel):
    total_reports: int
    total_entities: int
    total_relationships: int
    total_attack_chains: int
    total_iocs: int
    total_mitre_techniques: int
    entity_distribution: Dict[str, int]
    stage_distribution: Dict[str, int]
    recent_investigations: List[Dict[str, Any]]

# Model Evaluation schemas
class EvaluationMetrics(BaseModel):
    model_name: str
    model_version: str
    checkpoint_path: str
    evaluation_dataset_size: int
    entity_metrics: Dict[str, float]  # precision, recall, f1
    relationship_metrics: Dict[str, float]
    per_class_metrics: Dict[str, Dict[str, float]]
    confusion_matrix: Optional[Dict[str, Any]] = None
    inference_time_ms: float
    evaluated_at: datetime
