import os
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Response
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.config import settings
from app.database.session import get_db
from app.models.models import (
    Report, AnalysisRun, ExtractedEntity, ExtractedRelationship,
    AttackGraph, IndicatorOfCompromise, MITREMapping, AnalystCorrection
)
from app.schemas.schemas import (
    ReportResponse, ReportDetailResponse, ExtractedEntityResponse,
    ExtractedRelationshipResponse, RelationshipUpdate, AttackGraphResponse,
    IOCResponse, MITREMappingResponse, DashboardStats
)
from app.services.document_parser import DocumentParser
from app.services.entity_extractor import EntityExtractor
from app.services.relationship_extractor import RelationshipExtractor
from app.services.attack_graph_builder import AttackGraphBuilder
from app.services.ioc_extractor import IOCExtractor
from app.services.mitre_mapper import MITREMapper
from app.services.report_generator import InvestigationReportGenerator
from app.services.model_evaluator import ModelEvaluator

router = APIRouter()

# Reusable service singletons
entity_extractor = EntityExtractor()
relationship_extractor = RelationshipExtractor()
graph_builder = AttackGraphBuilder()
ioc_extractor = IOCExtractor()
mitre_mapper = MITREMapper()
model_evaluator = ModelEvaluator()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "model_status": entity_extractor.model_status,
        "model_name": entity_extractor.model_name,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_reports = db.query(Report).count()
    total_entities = db.query(ExtractedEntity).count()
    total_relationships = db.query(ExtractedRelationship).count()
    total_attack_chains = db.query(AttackGraph).count()
    total_iocs = db.query(IndicatorOfCompromise).count()
    total_mitre = db.query(MITREMapping).count()

    # Entity distribution by type
    entity_dist_rows = db.query(
        ExtractedEntity.entity_type, func.count(ExtractedEntity.id)
    ).group_by(ExtractedEntity.entity_type).all()
    entity_distribution = {row[0]: row[1] for row in entity_dist_rows}

    # Stage distribution
    stage_dist_rows = db.query(
        ExtractedEntity.attack_stage, func.count(ExtractedEntity.id)
    ).filter(ExtractedEntity.attack_stage.isnot(None)).group_by(ExtractedEntity.attack_stage).all()
    stage_distribution = {row[0]: row[1] for row in stage_dist_rows}

    # Recent investigations
    recent_reports = db.query(Report).order_by(Report.created_at.desc()).limit(5).all()
    recent_investigations = []
    for r in recent_reports:
        recent_investigations.append({
            "id": r.id,
            "filename": r.original_filename,
            "status": r.status,
            "created_at": r.created_at.isoformat() + "Z",
            "total_entities": len(r.entities),
            "total_relationships": len(r.relationships)
        })

    return {
        "total_reports": total_reports,
        "total_entities": total_entities,
        "total_relationships": total_relationships,
        "total_attack_chains": total_attack_chains,
        "total_iocs": total_iocs,
        "total_mitre_techniques": total_mitre,
        "entity_distribution": entity_distribution,
        "stage_distribution": stage_distribution,
        "recent_investigations": recent_investigations
    }


@router.post("/reports/upload", response_model=ReportResponse)
async def upload_report(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    original_filename = file.filename or "unknown_report.txt"
    ext = os.path.splitext(original_filename)[1].lower()

    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    # Read and validate size
    content_bytes = await file.read()
    file_size = len(content_bytes)

    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB."
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

    # Save to uploads directory
    report_id = str(uuid.uuid4())
    stored_filename = f"{report_id}_{original_filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_filename)

    with open(file_path, "wb") as f:
        f.write(content_bytes)

    # Parse file contents
    try:
        parsed_doc = DocumentParser.parse_file(file_path, original_filename)
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process document: {str(e)}"
        )

    # Create Report DB Record
    new_report = Report(
        id=report_id,
        filename=stored_filename,
        original_filename=original_filename,
        file_type=parsed_doc["file_type"],
        file_size=file_size,
        file_path=file_path,
        title=parsed_doc.get("title", original_filename),
        content=parsed_doc["content"],
        status="uploaded"
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return {
        "id": new_report.id,
        "filename": new_report.filename,
        "original_filename": new_report.original_filename,
        "file_type": new_report.file_type,
        "file_size": new_report.file_size,
        "title": new_report.title,
        "status": new_report.status,
        "created_at": new_report.created_at,
        "updated_at": new_report.updated_at,
        "content_snippet": new_report.content[:300] + "...",
        "total_entities": 0,
        "total_relationships": 0
    }


@router.get("/reports", response_model=List[ReportResponse])
def list_reports(db: Session = Depends(get_db)):
    reports = db.query(Report).order_by(Report.created_at.desc()).all()
    results = []
    for r in reports:
        results.append({
            "id": r.id,
            "filename": r.filename,
            "original_filename": r.original_filename,
            "file_type": r.file_type,
            "file_size": r.file_size,
            "title": r.title,
            "status": r.status,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
            "content_snippet": (r.content[:200] + "...") if r.content else "",
            "total_entities": len(r.entities),
            "total_relationships": len(r.relationships)
        })
    return results


# Built-in reports endpoints
@router.get("/reports/builtin")
def list_builtin_reports():
    reports_info = [
        {
            "filename": "cti_report_01_phishing_powershell.txt",
            "title": "Phishing Campaign Delivering a Malicious Payload",
            "scenario": "Phishing Email and PowerShell-Based Malware Delivery",
            "description": "Enterprise investigation involving phishing link, malicious attachment, PowerShell execution, registry persistence, scheduled tasks, and C2 domain.",
            "file_type": "txt"
        },
        {
            "filename": "cti_report_02_office_document.txt",
            "title": "Suspicious Office Document Leading to Script-Based Execution",
            "scenario": "Malicious Office Document and Script Execution",
            "description": "Macro-enabled Word document invoking wscript/cscript child processes, dropping VBS script, and querying outbound staging infrastructure.",
            "file_type": "txt"
        },
        {
            "filename": "cti_report_03_web_exploitation.txt",
            "title": "Suspicious Requests Against a Public-Facing Web Application",
            "scenario": "Exploitation of a Public-Facing Application",
            "description": "Targeted HTTP exploitation of web server upload handler resulting in webshell dropping and unconfirmed outbound connection.",
            "file_type": "txt"
        },
        {
            "filename": "cti_report_04_ransomware_activity.txt",
            "title": "Endpoint Investigation of Suspicious File Modification",
            "scenario": "Ransomware Preparation and Impact",
            "description": "Finance workstation alert involving document encryption, vssadmin shadow copy deletion attempt, and ransom note generation.",
            "file_type": "txt"
        },
        {
            "filename": "cti_report_05_remote_access.txt",
            "title": "Investigation of Unusual Remote Access and Data Transfer",
            "scenario": "Suspicious Remote Access and Possible Data Exfiltration",
            "description": "Abnormal off-hours credential access, PowerShell archive creation, and subsequent 120MB outbound data transmission.",
            "file_type": "txt"
        }
    ]
    return reports_info


@router.get("/reports/builtin/{filename}/download")
def download_builtin_report(filename: str):
    file_path = os.path.join(settings.BUILTIN_REPORTS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Built-in report file not found")
    return FileResponse(
        file_path,
        media_type="text/plain",
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/reports/builtin/{filename}/load", response_model=ReportResponse)
def load_and_analyze_builtin_report(filename: str, db: Session = Depends(get_db)):
    file_path = os.path.join(settings.BUILTIN_REPORTS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Built-in report file not found")

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Check if this built-in report is already in the database
    existing = db.query(Report).filter(Report.original_filename == filename).first()
    if existing:
        return {
            "id": existing.id,
            "filename": existing.filename,
            "original_filename": existing.original_filename,
            "file_type": existing.file_type,
            "file_size": existing.file_size,
            "title": existing.title,
            "status": existing.status,
            "created_at": existing.created_at,
            "updated_at": existing.updated_at,
            "content_snippet": existing.content[:300] + "...",
            "total_entities": len(existing.entities),
            "total_relationships": len(existing.relationships)
        }

    parsed = DocumentParser.parse_file(file_path, filename)
    report_id = str(uuid.uuid4())
    stored_name = f"{report_id}_{filename}"

    new_report = Report(
        id=report_id,
        filename=stored_name,
        original_filename=filename,
        file_type="txt",
        file_size=os.path.getsize(file_path),
        file_path=file_path,
        title=parsed.get("title", filename),
        content=content,
        status="uploaded"
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return {
        "id": new_report.id,
        "filename": new_report.filename,
        "original_filename": new_report.original_filename,
        "file_type": new_report.file_type,
        "file_size": new_report.file_size,
        "title": new_report.title,
        "status": new_report.status,
        "created_at": new_report.created_at,
        "updated_at": new_report.updated_at,
        "content_snippet": new_report.content[:300] + "...",
        "total_entities": 0,
        "total_relationships": 0
    }


@router.get("/reports/{report_id}", response_model=ReportDetailResponse)
def get_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.post("/reports/{report_id}/analyze")
def analyze_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = "analyzing"
    db.commit()

    try:
        # Create AnalysisRun record
        run = AnalysisRun(
            report_id=report.id,
            model_name=entity_extractor.model_name,
            model_version="1.0",
            status="running",
            started_at=datetime.utcnow()
        )
        db.add(run)
        db.commit()

        # Clear existing entities and relationships if re-analyzing
        db.query(ExtractedEntity).filter(ExtractedEntity.report_id == report_id).delete()
        db.query(ExtractedRelationship).filter(ExtractedRelationship.report_id == report_id).delete()
        db.query(AttackGraph).filter(AttackGraph.report_id == report_id).delete()
        db.query(IndicatorOfCompromise).filter(IndicatorOfCompromise.report_id == report_id).delete()
        db.query(MITREMapping).filter(MITREMapping.report_id == report_id).delete()
        db.commit()

        # Stage 2: Transformer-based entity extraction
        raw_entities = entity_extractor.extract_entities(report.content)
        entity_db_records = []
        for e in raw_entities:
            rec = ExtractedEntity(
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
            )
            entity_db_records.append(rec)
            db.add(rec)
        db.commit()

        # Stage 3: Relationship extraction
        raw_relationships = relationship_extractor.extract_relationships(report.content, raw_entities)
        rel_db_records = []
        for r in raw_relationships:
            rec = ExtractedRelationship(
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
            )
            rel_db_records.append(rec)
            db.add(rec)
        db.commit()

        # Stage 4: Attack sequence reconstruction & NetworkX graph
        graph_data = graph_builder.build_graph(report.id, raw_entities, raw_relationships)
        attack_graph_record = AttackGraph(
            report_id=report.id,
            analysis_run_id=run.id,
            nodes_json=graph_data["nodes"],
            edges_json=graph_data["edges"],
            stages_json=graph_data["stages"],
            connected_components_count=graph_data["connected_components_count"],
            detected_cycles_count=graph_data["detected_cycles_count"]
        )
        db.add(attack_graph_record)

        # Stage 5: IOC Intelligence
        raw_iocs = ioc_extractor.extract_iocs(report.content)
        for ioc in raw_iocs:
            ioc_rec = IndicatorOfCompromise(
                id=ioc["id"],
                report_id=report.id,
                ioc_type=ioc["ioc_type"],
                value=ioc["value"],
                verification_status=ioc["verification_status"],
                evidence_sentence=ioc.get("evidence_sentence"),
                is_defanged=ioc.get("is_defanged", False)
            )
            db.add(ioc_rec)

        # Stage 6: MITRE ATT&CK Mapping
        raw_mitre = mitre_mapper.map_behaviors(report.content, raw_entities)
        for m in raw_mitre:
            m_rec = MITREMapping(
                id=m["id"],
                report_id=report.id,
                technique_id=m["technique_id"],
                technique_name=m["technique_name"],
                tactic=m["tactic"],
                evidence_sentence=m.get("evidence_sentence"),
                confidence_score=m.get("confidence_score", 0.90),
                mapping_method=m.get("mapping_method", "Behavioral Context"),
                url=m.get("url")
            )
            db.add(m_rec)

        # Complete analysis run and report status
        run.status = "completed"
        run.completed_at = datetime.utcnow()
        run.total_entities = len(raw_entities)
        run.total_relationships = len(raw_relationships)
        report.status = "analyzed"
        db.commit()

        return {
            "status": "success",
            "report_id": report.id,
            "entities_extracted": len(raw_entities),
            "relationships_identified": len(raw_relationships),
            "attack_stages": graph_data["stages"],
            "connected_components": graph_data["connected_components_count"],
            "iocs_found": len(raw_iocs),
            "mitre_techniques_mapped": len(raw_mitre)
        }
    except Exception as e:
        report.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis pipeline error: {str(e)}"
        )


@router.get("/reports/{report_id}/entities", response_model=List[ExtractedEntityResponse])
def get_report_entities(report_id: str, db: Session = Depends(get_db)):
    entities = db.query(ExtractedEntity).filter(ExtractedEntity.report_id == report_id).all()
    return entities


@router.get("/reports/{report_id}/relationships", response_model=List[ExtractedRelationshipResponse])
def get_report_relationships(report_id: str, db: Session = Depends(get_db)):
    relationships = db.query(ExtractedRelationship).filter(ExtractedRelationship.report_id == report_id).all()
    return relationships


@router.get("/reports/{report_id}/attack-graph", response_model=AttackGraphResponse)
def get_report_attack_graph(report_id: str, db: Session = Depends(get_db)):
    graph = db.query(AttackGraph).filter(AttackGraph.report_id == report_id).order_by(AttackGraph.created_at.desc()).first()
    if not graph:
        # Check if report exists
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        # Empty graph state
        return {
            "report_id": report_id,
            "nodes": [],
            "edges": [],
            "stages": [],
            "connected_components_count": 0,
            "detected_cycles_count": 0,
            "unresolved_relationships_count": 0
        }

    return {
        "report_id": graph.report_id,
        "nodes": graph.nodes_json,
        "edges": graph.edges_json,
        "stages": graph.stages_json or [],
        "connected_components_count": graph.connected_components_count,
        "detected_cycles_count": graph.detected_cycles_count,
        "unresolved_relationships_count": sum(1 for e in graph.edges_json if e.get("data", {}).get("classification") == "inferred"),
        "created_at": graph.created_at
    }


@router.get("/reports/{report_id}/iocs", response_model=List[IOCResponse])
def get_report_iocs(report_id: str, db: Session = Depends(get_db)):
    iocs = db.query(IndicatorOfCompromise).filter(IndicatorOfCompromise.report_id == report_id).all()
    return iocs


@router.get("/reports/{report_id}/mitre", response_model=List[MITREMappingResponse])
def get_report_mitre(report_id: str, db: Session = Depends(get_db)):
    mappings = db.query(MITREMapping).filter(MITREMapping.report_id == report_id).all()
    return mappings


@router.patch("/relationships/{relationship_id}")
def update_relationship(
    relationship_id: str,
    payload: RelationshipUpdate,
    db: Session = Depends(get_db)
):
    rel = db.query(ExtractedRelationship).filter(ExtractedRelationship.id == relationship_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")

    prev_val = {
        "validation_status": rel.validation_status,
        "relationship_type": rel.relationship_type,
        "classification": rel.classification,
        "analyst_notes": rel.analyst_notes
    }

    if payload.validation_status is not None:
        rel.validation_status = payload.validation_status
    if payload.analyst_notes is not None:
        rel.analyst_notes = payload.analyst_notes
    if payload.relationship_type is not None:
        rel.relationship_type = payload.relationship_type
    if payload.classification is not None:
        rel.classification = payload.classification

    # Record analyst correction audit log
    correction = AnalystCorrection(
        report_id=rel.report_id,
        target_type="relationship",
        target_id=rel.id,
        action="update",
        previous_value=prev_val,
        new_value={
            "validation_status": rel.validation_status,
            "relationship_type": rel.relationship_type,
            "classification": rel.classification,
            "analyst_notes": rel.analyst_notes
        },
        analyst_notes=payload.analyst_notes
    )
    db.add(correction)

    # Synchronize updated edge in AttackGraph
    graph = db.query(AttackGraph).filter(AttackGraph.report_id == rel.report_id).order_by(AttackGraph.created_at.desc()).first()
    if graph and graph.edges_json:
        updated_edges = []
        for e in graph.edges_json:
            if e.get("id") == rel.id:
                e["label"] = rel.relationship_type.replace("_", " ").lower()
                e["data"]["relationship_type"] = rel.relationship_type
                e["data"]["classification"] = rel.classification
                e["data"]["validation_status"] = rel.validation_status
                e["animated"] = (rel.classification == "inferred")
            updated_edges.append(e)
        graph.edges_json = updated_edges

    db.commit()
    db.refresh(rel)
    return rel


@router.delete("/reports/{report_id}")
def delete_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Delete physical file if exists
    if os.path.exists(report.file_path):
        try:
            os.remove(report.file_path)
        except Exception:
            pass

    db.delete(report)
    db.commit()
    return {"status": "deleted", "report_id": report_id}


@router.get("/reports/{report_id}/export")
def export_investigation_report(
    report_id: str,
    format: str = "json",
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    entities = [
        {"entity_type": e.entity_type, "normalized_value": e.normalized_value, "original_value": e.original_value, "confidence_score": e.confidence_score, "evidence_sentence": e.evidence_sentence, "attack_stage": e.attack_stage}
        for e in report.entities
    ]
    relationships = [
        {"source_label": r.source_label, "target_label": r.target_label, "relationship_type": r.relationship_type, "classification": r.classification, "evidence_sentence": r.evidence_sentence, "confidence_score": r.confidence_score, "validation_status": r.validation_status}
        for r in report.relationships
    ]
    iocs = [
        {"ioc_type": i.ioc_type, "value": i.value, "verification_status": i.verification_status}
        for i in report.iocs
    ]
    mitre = [
        {"technique_id": m.technique_id, "technique_name": m.technique_name, "tactic": m.tactic}
        for m in report.mitre_mappings
    ]

    graph = db.query(AttackGraph).filter(AttackGraph.report_id == report_id).first()
    graph_data = {
        "connected_components_count": graph.connected_components_count if graph else 1,
        "stages": graph.stages_json if graph else []
    }

    summary = InvestigationReportGenerator.generate_summary(
        {"id": report.id, "original_filename": report.original_filename, "content": report.content},
        entities, relationships, graph_data, iocs, mitre
    )

    if format.lower() == "markdown" or format.lower() == "md":
        md_text = InvestigationReportGenerator.to_markdown(summary)
        return PlainTextResponse(
            content=md_text,
            media_type="text/markdown",
            headers={"Content-Disposition": f"attachment; filename=investigation_{report.original_filename}.md"}
        )

    if format.lower() == "pdf":
        pdf_bytes = InvestigationReportGenerator.to_pdf(summary)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=investigation_{report.original_filename}.pdf"}
        )

    return summary



# Model Evaluation
@router.get("/evaluation/metrics")
def get_model_evaluation():
    return model_evaluator.evaluate()


@router.post("/evaluation/run")
def trigger_model_evaluation():
    return model_evaluator.evaluate()
