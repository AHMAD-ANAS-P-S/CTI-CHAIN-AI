import os
import sys
import uuid
from datetime import datetime

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from app.config import settings
from app.database.session import engine, SessionLocal
from app.database.base import Base
from app.models.models import (
    Report, AnalysisRun, ExtractedEntity, ExtractedRelationship,
    AttackGraph, IndicatorOfCompromise, MITREMapping
)
from app.services.document_parser import DocumentParser
from app.services.entity_extractor import EntityExtractor
from app.services.relationship_extractor import RelationshipExtractor
from app.services.attack_graph_builder import AttackGraphBuilder
from app.services.ioc_extractor import IOCExtractor
from app.services.mitre_mapper import MITREMapper

def init_and_seed():
    print("=" * 60)
    print("Initializing CTI Platform Database & Seeding 5 Scenarios")
    print("=" * 60)
    print(f"Target Database URL: {settings.DATABASE_URL}")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    ee = EntityExtractor()
    re_svc = RelationshipExtractor()
    gb = AttackGraphBuilder()
    ioc_svc = IOCExtractor()
    mm = MITREMapper()

    builtin_files = [
        "cti_report_01_phishing_powershell.txt",
        "cti_report_02_office_document.txt",
        "cti_report_03_web_exploitation.txt",
        "cti_report_04_ransomware_activity.txt",
        "cti_report_05_remote_access.txt"
    ]

    for fname in builtin_files:
        fpath = os.path.join(settings.BUILTIN_REPORTS_DIR, fname)
        if not os.path.exists(fpath):
            print(f"Warning: File {fpath} does not exist.")
            continue

        existing = db.query(Report).filter(Report.original_filename == fname).first()
        if existing and existing.status == "analyzed" and len(existing.entities) > 0:
            print(f"[OK] Report '{fname}' already analyzed. Entities: {len(existing.entities)}, Relations: {len(existing.relationships)}")
            continue

        print(f"\nProcessing '{fname}'...")
        parsed = DocumentParser.parse_file(fpath, fname)
        content = parsed["content"]

        if not existing:
            rep_id = str(uuid.uuid4())
            report = Report(
                id=rep_id,
                filename=f"{rep_id}_{fname}",
                original_filename=fname,
                file_type="txt",
                file_size=os.path.getsize(fpath),
                file_path=fpath,
                title=parsed.get("title", fname),
                content=content,
                status="analyzing"
            )
            db.add(report)
            db.commit()
            db.refresh(report)
        else:
            report = existing
            report.status = "analyzing"
            # Clear old records
            db.query(ExtractedEntity).filter(ExtractedEntity.report_id == report.id).delete()
            db.query(ExtractedRelationship).filter(ExtractedRelationship.report_id == report.id).delete()
            db.query(AttackGraph).filter(AttackGraph.report_id == report.id).delete()
            db.query(IndicatorOfCompromise).filter(IndicatorOfCompromise.report_id == report.id).delete()
            db.query(MITREMapping).filter(MITREMapping.report_id == report.id).delete()
            db.commit()

        # Analysis Run
        run = AnalysisRun(
            report_id=report.id,
            model_name=ee.model_name,
            model_version="1.0",
            status="running"
        )
        db.add(run)
        db.commit()

        # 1. Entities
        raw_entities = ee.extract_entities(content)
        for e in raw_entities:
            db.add(ExtractedEntity(
                id=e["id"],
                report_id=report.id,
                analysis_run_id=run.id,
                entity_type=e["entity_type"],
                normalized_value=e["normalized_value"],
                original_value=e["original_value"],
                confidence_score=e.get("confidence_score", 1.0),
                evidence_sentence=e.get("evidence_sentence"),
                paragraph_index=e.get("paragraph_index", 0),
                document_location=e.get("document_location"),
                attack_stage=e.get("attack_stage")
            ))
        db.commit()

        # 2. Relationships
        raw_rels = re_svc.extract_relationships(content, raw_entities)
        for r in raw_rels:
            db.add(ExtractedRelationship(
                id=r["id"],
                report_id=report.id,
                analysis_run_id=run.id,
                source_entity_id=r["source_entity_id"],
                target_entity_id=r["target_entity_id"],
                source_label=r["source_label"],
                target_label=r["target_label"],
                relationship_type=r["relationship_type"],
                evidence_sentence=r.get("evidence_sentence"),
                confidence_score=r.get("confidence_score", 1.0),
                classification=r.get("classification", "observed"),
                validation_status="unreviewed"
            ))
        db.commit()

        # 3. Attack Graph
        graph_data = gb.build_graph(report.id, raw_entities, raw_rels)
        db.add(AttackGraph(
            report_id=report.id,
            analysis_run_id=run.id,
            nodes_json=graph_data["nodes"],
            edges_json=graph_data["edges"],
            stages_json=graph_data["stages"],
            connected_components_count=graph_data["connected_components_count"],
            detected_cycles_count=graph_data["detected_cycles_count"]
        ))

        # 4. IOCs
        raw_iocs = ioc_svc.extract_iocs(content)
        for ioc in raw_iocs:
            db.add(IndicatorOfCompromise(
                id=ioc["id"],
                report_id=report.id,
                ioc_type=ioc["ioc_type"],
                value=ioc["value"],
                verification_status=ioc["verification_status"],
                evidence_sentence=ioc.get("evidence_sentence"),
                is_defanged=ioc.get("is_defanged", False)
            ))

        # 5. MITRE Mappings
        raw_mitre = mm.map_behaviors(content, raw_entities)
        for m in raw_mitre:
            db.add(MITREMapping(
                id=m["id"],
                report_id=report.id,
                technique_id=m["technique_id"],
                technique_name=m["technique_name"],
                tactic=m["tactic"],
                evidence_sentence=m.get("evidence_sentence"),
                confidence_score=m.get("confidence_score", 0.90),
                mapping_method=m.get("mapping_method", "Behavioral Context"),
                url=m.get("url")
            ))

        # Finalize run
        run.status = "completed"
        run.completed_at = datetime.utcnow()
        run.total_entities = len(raw_entities)
        run.total_relationships = len(raw_rels)
        report.status = "analyzed"
        db.commit()

        print(f"  -> Extracted: {len(raw_entities)} entities, {len(raw_rels)} relationships, {len(raw_iocs)} IOCs, {len(raw_mitre)} MITRE techniques.")
        print(f"  -> Stages: {', '.join(graph_data['stages'])}")

    db.close()
    print("\n[SUCCESS] All benchmark reports initialized and indexed successfully!")

if __name__ == "__main__":
    init_and_seed()
