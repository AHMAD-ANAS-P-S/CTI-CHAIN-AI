import os
import pytest
from app.services.document_parser import DocumentParser
from app.services.entity_extractor import EntityExtractor
from app.services.relationship_extractor import RelationshipExtractor
from app.services.attack_graph_builder import AttackGraphBuilder
from app.services.ioc_extractor import IOCExtractor
from app.services.mitre_mapper import MITREMapper
from app.services.report_generator import InvestigationReportGenerator
from app.config import settings

BUILTIN_REPORTS = [
    "cti_report_01_phishing_powershell.txt",
    "cti_report_02_office_document.txt",
    "cti_report_03_web_exploitation.txt",
    "cti_report_04_ransomware_activity.txt",
    "cti_report_05_remote_access.txt"
]

@pytest.fixture
def entity_extractor():
    return EntityExtractor()

@pytest.fixture
def rel_extractor():
    return RelationshipExtractor()

@pytest.fixture
def graph_builder():
    return AttackGraphBuilder()

def test_document_parser_txt():
    path = os.path.join(settings.BUILTIN_REPORTS_DIR, "cti_report_01_phishing_powershell.txt")
    doc = DocumentParser.parse_file(path, "cti_report_01_phishing_powershell.txt")
    assert doc["file_type"] == "txt"
    assert len(doc["content"]) > 100
    assert "powershell" in doc["content"].lower()

def test_document_parser_invalid_format():
    with pytest.raises(ValueError, match="Unsupported file format"):
        DocumentParser.parse_file("invalid.xyz", "test.xyz")

def test_document_parser_empty_file(tmp_path):
    empty_file = tmp_path / "empty.txt"
    empty_file.write_text("")
    with pytest.raises(ValueError, match="empty"):
        DocumentParser.parse_file(str(empty_file), "empty.txt")

@pytest.mark.parametrize("report_file", BUILTIN_REPORTS)
def test_pipeline_on_all_five_builtin_reports(report_file, entity_extractor, rel_extractor, graph_builder):
    path = os.path.join(settings.BUILTIN_REPORTS_DIR, report_file)
    assert os.path.exists(path), f"Report file {report_file} does not exist"

    doc = DocumentParser.parse_file(path, report_file)
    content = doc["content"]

    # 1. Entity Extraction
    entities = entity_extractor.extract_entities(content)
    assert len(entities) > 0, f"No entities extracted from {report_file}"
    
    # Verify entity structure & evidence preservation
    for e in entities:
        assert "id" in e
        assert "entity_type" in e
        assert "normalized_value" in e
        assert "original_value" in e
        assert "evidence_sentence" in e
        assert e["evidence_sentence"] is not None
        assert 0.0 <= e["confidence_score"] <= 1.0

    # Verify no duplicate normalized keys
    seen = set()
    for e in entities:
        key = f"{e['entity_type']}:{e['normalized_value'].lower()}"
        assert key not in seen, f"Duplicate entity detected: {key}"
        seen.add(key)

    # 2. Relationship Extraction
    relationships = rel_extractor.extract_relationships(content, entities)
    assert isinstance(relationships, list)
    for r in relationships:
        assert "source_entity_id" in r
        assert "target_entity_id" in r
        assert "relationship_type" in r
        assert "evidence_sentence" in r
        assert r["classification"] in ["observed", "inferred"]

    # 3. Graph Reconstruction
    graph = graph_builder.build_graph(f"test-{report_file}", entities, relationships)
    assert "nodes" in graph
    assert "edges" in graph
    assert len(graph["nodes"]) == len(entities)
    assert len(graph["edges"]) == len(relationships)
    assert graph["connected_components_count"] >= 1
    assert isinstance(graph["stages"], list)

    # 4. IOC Extraction
    ioc_svc = IOCExtractor()
    iocs = ioc_svc.extract_iocs(content)
    assert isinstance(iocs, list)
    for ioc in iocs:
        assert ioc["ioc_type"] in ["ipv4", "ipv6", "domain", "url", "email", "sha256", "sha1", "md5", "filename"]
        assert ioc["verification_status"] == "extracted_unverified"

    # 5. MITRE Mapping
    mitre_svc = MITREMapper()
    mappings = mitre_svc.map_behaviors(content, entities)
    assert isinstance(mappings, list)
    assert len(mappings) > 0
    for m in mappings:
        assert m["technique_id"].startswith("T")
        assert len(m["technique_name"]) > 0

    # 6. Report Summary Synthesis
    summary = InvestigationReportGenerator.generate_summary(
        {"id": "test", "original_filename": report_file, "content": content},
        entities, relationships, graph, iocs, mappings
    )
    assert summary["total_entities"] == len(entities)
    assert summary["total_relationships"] == len(relationships)
    assert len(summary["analyst_recommendations"]) > 0
    assert len(summary["missing_information"]) > 0

def test_report_1_specific_artifacts(entity_extractor, rel_extractor):
    path = os.path.join(settings.BUILTIN_REPORTS_DIR, "cti_report_01_phishing_powershell.txt")
    doc = DocumentParser.parse_file(path, "cti_report_01_phishing_powershell.txt")
    entities = entity_extractor.extract_entities(doc["content"])
    vals = [e["normalized_value"].lower() for e in entities]
    
    assert "alicexawiayam" in vals
    assert "ted_lee@trendmicro.com" in vals
    assert "powershell.exe" in vals
    assert "www.bdofc1dltg.com" in vals

def test_report_4_ransomware_artifacts(entity_extractor):
    path = os.path.join(settings.BUILTIN_REPORTS_DIR, "cti_report_04_ransomware_activity.txt")
    doc = DocumentParser.parse_file(path, "cti_report_04_ransomware_activity.txt")
    entities = entity_extractor.extract_entities(doc["content"])
    vals = [e["normalized_value"].lower() for e in entities]
    
    assert "finance-pc-07" in vals
    assert "vssadmin.exe" in vals
    assert any("read_files.txt" in v for v in vals)

def test_disconnected_components_handling(graph_builder):
    # Test disconnected graph handling
    dummy_entities = [
        {"id": "e1", "entity_type": "HOST", "original_value": "HOST-A", "normalized_value": "host-a", "confidence_score": 1.0, "attack_stage": "Execution"},
        {"id": "e2", "entity_type": "HOST", "original_value": "HOST-B", "normalized_value": "host-b", "confidence_score": 1.0, "attack_stage": "Execution"},
    ]
    dummy_relationships = []  # No edge connecting e1 and e2
    graph = graph_builder.build_graph("disc-test", dummy_entities, dummy_relationships)
    assert graph["connected_components_count"] == 2
    assert len(graph["nodes"]) == 2
    assert len(graph["edges"]) == 0
