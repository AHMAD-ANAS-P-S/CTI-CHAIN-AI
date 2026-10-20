import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.database.base import Base

def generate_uuid():
    return str(uuid.uuid4())

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(10), nullable=False)  # pdf, docx, txt, md
    file_size = Column(Integer, default=0)
    file_path = Column(String(500), nullable=False)
    title = Column(String(500), nullable=True)
    content = Column(Text, nullable=False)
    status = Column(String(50), default="uploaded")  # uploaded, analyzing, analyzed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    entities = relationship("ExtractedEntity", back_populates="report", cascade="all, delete-orphan")
    relationships = relationship("ExtractedRelationship", back_populates="report", cascade="all, delete-orphan")
    attack_graphs = relationship("AttackGraph", back_populates="report", cascade="all, delete-orphan")
    iocs = relationship("IndicatorOfCompromise", back_populates="report", cascade="all, delete-orphan")
    mitre_mappings = relationship("MITREMapping", back_populates="report", cascade="all, delete-orphan")
    analysis_runs = relationship("AnalysisRun", back_populates="report", cascade="all, delete-orphan")
    analyst_corrections = relationship("AnalystCorrection", back_populates="report", cascade="all, delete-orphan")


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    model_name = Column(String(100), default="CTI-Transformer-Adapter")
    model_version = Column(String(50), default="v1.0")
    status = Column(String(50), default="completed")
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, default=datetime.utcnow)
    total_entities = Column(Integer, default=0)
    total_relationships = Column(Integer, default=0)
    summary_json = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)

    report = relationship("Report", back_populates="analysis_runs")


class ExtractedEntity(Base):
    __tablename__ = "extracted_entities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    analysis_run_id = Column(String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=True)
    entity_type = Column(String(50), nullable=False)  # USER, HOST, MALWARE, etc.
    normalized_value = Column(String(500), nullable=False)
    original_value = Column(String(500), nullable=False)
    confidence_score = Column(Float, default=1.0)
    evidence_sentence = Column(Text, nullable=True)
    paragraph_index = Column(Integer, default=0)
    document_location = Column(JSON, nullable=True)  # {"start": 10, "end": 25}
    attack_stage = Column(String(50), nullable=True)  # Delivery, Execution, Persistence, etc.
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="entities")


class ExtractedRelationship(Base):
    __tablename__ = "extracted_relationships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    analysis_run_id = Column(String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=True)
    source_entity_id = Column(String(36), ForeignKey("extracted_entities.id", ondelete="CASCADE"), nullable=False)
    target_entity_id = Column(String(36), ForeignKey("extracted_entities.id", ondelete="CASCADE"), nullable=False)
    source_label = Column(String(500), nullable=False)
    target_label = Column(String(500), nullable=False)
    relationship_type = Column(String(50), nullable=False)  # SENT_TO, SPAWNED_PROCESS, etc.
    evidence_sentence = Column(Text, nullable=True)
    confidence_score = Column(Float, default=1.0)
    classification = Column(String(20), default="observed")  # observed or inferred
    validation_status = Column(String(20), default="unreviewed")  # unreviewed, confirmed, rejected, uncertain
    analyst_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="relationships")
    source_entity = relationship("ExtractedEntity", foreign_keys=[source_entity_id])
    target_entity = relationship("ExtractedEntity", foreign_keys=[target_entity_id])


class AttackGraph(Base):
    __tablename__ = "attack_graphs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    analysis_run_id = Column(String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=True)
    nodes_json = Column(JSON, nullable=False)
    edges_json = Column(JSON, nullable=False)
    stages_json = Column(JSON, nullable=True)
    connected_components_count = Column(Integer, default=1)
    detected_cycles_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="attack_graphs")


class IndicatorOfCompromise(Base):
    __tablename__ = "indicators_of_compromise"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    ioc_type = Column(String(50), nullable=False)  # ipv4, ipv6, domain, url, md5, sha1, sha256, file, email
    value = Column(String(500), nullable=False)
    verification_status = Column(String(50), default="extracted_unverified")  # extracted_unverified, analyst_verified, suspicious, benign
    evidence_sentence = Column(Text, nullable=True)
    is_defanged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="iocs")


class MITREMapping(Base):
    __tablename__ = "mitre_mappings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    technique_id = Column(String(50), nullable=False)  # e.g., T1059.001
    technique_name = Column(String(255), nullable=False)
    tactic = Column(String(100), nullable=False)
    evidence_sentence = Column(Text, nullable=True)
    confidence_score = Column(Float, default=0.90)
    mapping_method = Column(String(50), default="Rule-Based Indicator")
    url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="mitre_mappings")


class AnalystCorrection(Base):
    __tablename__ = "analyst_corrections"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    target_type = Column(String(50), nullable=False)  # relationship, entity, stage, mitre
    target_id = Column(String(36), nullable=False)
    action = Column(String(50), nullable=False)  # confirm, reject, modify, add
    previous_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    analyst_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="analyst_corrections")


class ModelConfiguration(Base):
    __tablename__ = "model_configurations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    model_name = Column(String(100), nullable=False)
    checkpoint_path = Column(String(500), nullable=False)
    is_active = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
