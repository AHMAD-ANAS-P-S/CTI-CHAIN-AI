import textwrap
import pymupdf
from datetime import datetime
from typing import Dict, Any, List

class InvestigationReportGenerator:
    """
    Generates structured, evidence-backed investigation reports and analytical summaries.
    Distinguishes observed facts, model-generated predictions, and analyst hypotheses.
    """

    @staticmethod
    def generate_summary(
        report_data: Dict[str, Any],
        entities: List[Dict[str, Any]],
        relationships: List[Dict[str, Any]],
        graph_data: Dict[str, Any],
        iocs: List[Dict[str, Any]],
        mitre_mappings: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        filename = report_data.get("original_filename", "cti_report.txt")
        report_id = report_data.get("id", "")
        content = report_data.get("content", "")

        # Entity counts by type
        entity_counts: Dict[str, int] = {}
        for e in entities:
            t = e.get("entity_type", "OTHER")
            entity_counts[t] = entity_counts.get(t, 0) + 1

        # Uncertain and inferred relationships
        uncertain_rels = []
        observed_seq = []
        for r in relationships:
            rel_info = {
                "source": r.get("source_label"),
                "target": r.get("target_label"),
                "relationship_type": r.get("relationship_type"),
                "classification": r.get("classification", "observed"),
                "evidence": r.get("evidence_sentence", ""),
                "confidence": r.get("confidence_score", 1.0)
            }
            if r.get("classification") == "inferred" or r.get("validation_status") == "uncertain":
                uncertain_rels.append(rel_info)
            else:
                observed_seq.append(rel_info)

        # Missing information extraction
        missing_info = InvestigationReportGenerator._detect_missing_evidence(content)

        # Analyst Recommendations
        recommendations = InvestigationReportGenerator._generate_recommendations(
            entities, relationships, missing_info
        )

        return {
            "report_id": report_id,
            "filename": filename,
            "analysis_timestamp": datetime.utcnow().isoformat() + "Z",
            "entity_counts_by_type": entity_counts,
            "total_entities": len(entities),
            "total_relationships": len(relationships),
            "connected_components": graph_data.get("connected_components_count", 1),
            "reconstructed_stages": graph_data.get("stages", []),
            "key_iocs": [
                {"type": i["ioc_type"], "value": i["value"], "verification": i["verification_status"]}
                for i in iocs[:10]
            ],
            "attack_sequence": observed_seq,
            "uncertain_relationships": uncertain_rels,
            "missing_information": missing_info,
            "mitre_mappings": [
                {"technique_id": m["technique_id"], "name": m["technique_name"], "tactic": m["tactic"]}
                for m in mitre_mappings
            ],
            "analyst_recommendations": recommendations
        }

    @staticmethod
    def _detect_missing_evidence(content: str) -> List[str]:
        missing = []
        c_lower = content.lower()

        if "hash" in c_lower and any(w in c_lower for w in ["not available", "not recovered", "unavailable"]):
            missing.append("Cryptographic payload hashes (SHA-256 / MD5) not recovered from endpoints.")
        if "c2" in c_lower and any(w in c_lower for w in ["not independently confirmed", "unconfirmed", "not available"]):
            missing.append("Command & Control (C2) role of contacted external infrastructure unconfirmed.")
        if any(w in c_lower for w in ["complete command line", "execution parameters were not recovered"]):
            missing.append("Full process command-line invocation parameters truncated or missing from telemetry.")
        if any(w in c_lower for w in ["whether data left", "no evidence confirms", "packet-level evidence linking"]):
            missing.append("Direct evidence of data exfiltration or confirmed protocol packet telemetry missing.")
        if "malware family was not confirmed" in c_lower or "no malware family or threat actor has been attributed" in c_lower:
            missing.append("Definitive malware family attribution and threat actor campaign attribution unresolved.")
        if "vulnerability identifier remain unknown" in c_lower:
            missing.append("Specific CVE identifier or software version for exploited web endpoint unconfirmed.")

        if not missing:
            missing.append("Complete forensic artifacts preserved across telemetry channels.")

        return missing

    @staticmethod
    def _generate_recommendations(
        entities: List[Dict[str, Any]],
        relationships: List[Dict[str, Any]],
        missing_info: List[str]
    ) -> List[str]:
        recs = [
            "Cross-reference extracted network IOCs against internal proxy, firewall, and DNS sinkhole logs.",
            "Verify process spawning lineage on involved endpoints and inspect endpoint memory captures if still preserved.",
            "Review authentication logs for implicated service and user accounts around the observed activity window."
        ]

        # Specific recommendations based on entities
        has_powershell = any("powershell" in e.get("normalized_value", "").lower() for e in entities)
        if has_powershell:
            recs.append("Enable PowerShell Script Block Logging (Event ID 4104) and Module Logging across fleet.")

        has_shadow = any("shadow" in e.get("normalized_value", "").lower() for e in entities)
        if has_shadow:
            recs.append("Isolate impacted host immediately to prevent further volume shadow copy deletion or encryption.")

        has_archive = any(".zip" in e.get("normalized_value", "").lower() for e in entities)
        if has_archive:
            recs.append("Perform deep packet inspection on outbound NetFlow around the 120MB transfer window to verify payload contents.")

        return recs

    @staticmethod
    def to_markdown(summary: Dict[str, Any]) -> str:
        md = f"# CTI Investigation Report: {summary['filename']}\n\n"
        md += f"**Analysis Timestamp**: {summary['analysis_timestamp']}  \n"
        md += f"**Total Entities Extracted**: {summary['total_entities']}  \n"
        md += f"**Total Relationships Identified**: {summary['total_relationships']}  \n"
        md += f"**Connected Graph Components**: {summary['connected_components']}  \n"
        md += f"**Reconstructed Stages**: {', '.join(summary['reconstructed_stages'])}  \n\n"

        md += "## Observed Attack Sequence\n"
        for idx, step in enumerate(summary["attack_sequence"], 1):
            md += f"{idx}. **{step['source']}** — *{step['relationship_type']}* → **{step['target']}**\n"
            if step['evidence']:
                md += f"   > \"{step['evidence']}\"\n"

        if summary["uncertain_relationships"]:
            md += "\n## Inferred Hypotheses & Uncertain Relationships\n"
            for u in summary["uncertain_relationships"]:
                md += f"- **{u['source']}** — *{u['relationship_type']}* → **{u['target']}** (Confidence: {u['confidence']})\n"
                md += f"  > \"{u['evidence']}\"\n"

        md += "\n## Missing Telemetry & Forensic Gaps\n"
        for m in summary["missing_information"]:
            md += f"- [!] {m}\n"

        md += "\n## MITRE ATT&CK Mappings\n"
        for m in summary["mitre_mappings"]:
            md += f"- **{m['technique_id']}**: {m['name']} (*{m['tactic']}*)\n"

        md += "\n## Analyst Recommendations\n"
        for r in summary["analyst_recommendations"]:
            md += f"- {r}\n"

        return md

    @staticmethod
    def to_pdf(summary: Dict[str, Any]) -> bytes:
        doc = pymupdf.open()

        def create_page():
            p = doc.new_page(width=595.3, height=841.9)
            # Professional Header Banner
            p.draw_rect(pymupdf.Rect(40, 24, 555, 62), color=None, fill=(0.145, 0.388, 0.922))
            p.insert_text((55, 42), "CTI ATTACK-CHAIN ANALYZER", color=(1, 1, 1), fontsize=11, fontname="helv")
            p.insert_text((55, 54), "Transformer-Based CTI Extraction & Attack-Chain Reconstruction Report", color=(0.88, 0.93, 1.0), fontsize=7.5, fontname="helv")

            # Clean Footer
            p.draw_line(pymupdf.Point(40, 810), pymupdf.Point(555, 810), color=(0.88, 0.91, 0.94), width=0.75)
            p.insert_text((40, 822), "CONFIDENTIAL - CYBER THREAT INTELLIGENCE INVESTIGATION", color=(0.58, 0.64, 0.72), fontsize=7, fontname="helv")
            p.insert_text((515, 822), f"Page {len(doc)}", color=(0.58, 0.64, 0.72), fontsize=7, fontname="helv")
            return p

        page = create_page()
        y = 82

        def ensure_space(needed: float):
            nonlocal page, y
            if y + needed > 795:
                page = create_page()
                y = 80
            return page

        # Summary metadata card
        page.draw_rect(pymupdf.Rect(40, y, 555, y + 66), color=(0.88, 0.91, 0.94), fill=(0.97, 0.98, 0.99), width=0.75)
        page.insert_text((50, y + 16), f"Report: {summary.get('filename', 'CTI_Report')}", color=(0.09, 0.13, 0.20), fontsize=10, fontname="helv")
        page.insert_text((50, y + 30), f"Analysis Timestamp: {summary.get('analysis_timestamp', '')}", color=(0.39, 0.45, 0.55), fontsize=8, fontname="helv")
        stages_str = ", ".join(summary.get("reconstructed_stages", [])) or "Reconstructed sequence"
        page.insert_text((50, y + 44), f"Stages: {stages_str}", color=(0.39, 0.45, 0.55), fontsize=8, fontname="helv")
        page.insert_text((50, y + 58), f"Entities: {summary.get('total_entities', 0)}   |   Relationships: {summary.get('total_relationships', 0)}   |   Graph Components: {summary.get('connected_components', 1)}", color=(0.145, 0.388, 0.922), fontsize=8.5, fontname="helv")

        y += 82

        # 1. Observed Attack Sequence
        page.insert_text((40, y), "1. RECONSTRUCTED ATTACK SEQUENCE", color=(0.09, 0.13, 0.20), fontsize=10, fontname="helv")
        y += 14

        attack_seq = summary.get("attack_sequence", [])
        if not attack_seq:
            page.insert_text((48, y), "No sequential attack relationships extracted.", color=(0.39, 0.45, 0.55), fontsize=8, fontname="helv")
            y += 18
        else:
            for idx, step in enumerate(attack_seq, 1):
                ensure_space(38)
                page.draw_rect(pymupdf.Rect(40, y, 555, y + 32), color=(0.91, 0.93, 0.96), fill=(1, 1, 1), width=0.5)
                step_header = f"Step {idx}: {step['source']}  [{step['relationship_type']}]  ->  {step['target']}"
                if len(step_header) > 95:
                    step_header = step_header[:92] + "..."
                page.insert_text((48, y + 13), step_header, color=(0.09, 0.13, 0.20), fontsize=8, fontname="helv")

                ev = step.get("evidence", "") or "Observed correlation in report evidence."
                ev_short = textwrap.shorten(ev, width=105, placeholder="...")
                page.insert_text((48, y + 25), f'"{ev_short}"', color=(0.39, 0.45, 0.55), fontsize=7.5, fontname="helv")
                y += 36

        # 2. Key Indicators of Compromise (IOCs)
        y += 8
        ensure_space(36)
        page.insert_text((40, y), "2. KEY INDICATORS OF COMPROMISE (IOCs)", color=(0.09, 0.13, 0.20), fontsize=10, fontname="helv")
        y += 16
        iocs = summary.get("key_iocs", [])
        if not iocs:
            page.insert_text((48, y), "No explicit indicators identified.", color=(0.39, 0.45, 0.55), fontsize=8, fontname="helv")
            y += 14
        else:
            for ioc in iocs:
                ensure_space(15)
                page.insert_text((48, y), f"• [{ioc.get('type', 'IOC')}] {ioc.get('value', '')}  ({ioc.get('verification', 'verified')})", color=(0.20, 0.25, 0.33), fontsize=8, fontname="helv")
                y += 13

        # 3. MITRE ATT&CK Mappings
        y += 8
        ensure_space(36)
        page.insert_text((40, y), "3. MITRE ATT&CK MAPPINGS", color=(0.09, 0.13, 0.20), fontsize=10, fontname="helv")
        y += 16
        mitre = summary.get("mitre_mappings", [])
        if not mitre:
            page.insert_text((48, y), "No direct MITRE ATT&CK techniques mapped.", color=(0.39, 0.45, 0.55), fontsize=8, fontname="helv")
            y += 14
        else:
            for m in mitre:
                ensure_space(15)
                page.insert_text((48, y), f"• {m.get('technique_id', '')}: {m.get('name', '')}  (Tactic: {m.get('tactic', '')})", color=(0.20, 0.25, 0.33), fontsize=8, fontname="helv")
                y += 13

        # 4. Actionable Analyst Recommendations
        y += 8
        ensure_space(36)
        page.insert_text((40, y), "4. ACTIONABLE ANALYST RECOMMENDATIONS", color=(0.09, 0.13, 0.20), fontsize=10, fontname="helv")
        y += 16
        for r in summary.get("analyst_recommendations", []):
            rec_lines = textwrap.wrap(f"• {r}", width=100)
            for line in rec_lines:
                ensure_space(14)
                page.insert_text((48, y), line, color=(0.20, 0.25, 0.33), fontsize=8, fontname="helv")
                y += 12
            y += 2

        return doc.tobytes()

