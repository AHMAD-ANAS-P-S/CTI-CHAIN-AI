import networkx as nx
from typing import List, Dict, Any, Tuple, Set

# Stage order priority
STAGE_ORDER = [
    "Initial access",
    "Delivery",
    "Execution",
    "Persistence",
    "Privilege escalation",
    "Defense evasion",
    "Discovery",
    "Command and control",
    "Lateral movement",
    "Collection",
    "Exfiltration",
    "Impact"
]

CATEGORY_ICONS = {
    "USER": "User",
    "HOST": "Laptop",
    "EMAIL_ADDRESS": "Mail",
    "EMAIL_SUBJECT": "MailQuestion",
    "ATTACHMENT": "Paperclip",
    "URL": "Globe",
    "DOMAIN": "Network",
    "IP_ADDRESS": "Radio",
    "PROCESS": "Terminal",
    "COMMAND": "Code",
    "REGISTRY_KEY": "KeyRound",
    "SERVICE": "Cog",
    "SCHEDULED_TASK": "Clock",
    "MALWARE": "Bug",
    "RANSOMWARE": "ShieldAlert",
    "FILE": "FileText",
    "DROPPED_FILE": "FileDown",
    "FILE_HASH": "Hash",
    "C2_SERVER": "Server",
    "ORGANIZATION": "Building",
    "VULNERABILITY": "AlertTriangle",
    "ATTACK_TECHNIQUE": "Crosshair",
    "TOOL": "Wrench",
    "NETWORK_CONNECTION": "ArrowRightLeft"
}

CATEGORY_COLORS = {
    "USER": "#2563eb",           # Blue
    "HOST": "#475569",           # Slate
    "EMAIL_ADDRESS": "#4f46e5",   # Indigo
    "EMAIL_SUBJECT": "#6366f1",   # Indigo
    "URL": "#0891b2",            # Cyan
    "DOMAIN": "#0284c7",         # Sky
    "IP_ADDRESS": "#2563eb",     # Blue
    "PROCESS": "#7c3aed",        # Violet
    "COMMAND": "#8b5cf6",        # Violet
    "REGISTRY_KEY": "#d97706",   # Amber
    "SERVICE": "#64748b",        # Slate
    "SCHEDULED_TASK": "#b45309", # Amber
    "MALWARE": "#dc2626",        # Red
    "RANSOMWARE": "#b91c1c",     # Dark Red
    "FILE": "#0d9488",           # Teal
    "DROPPED_FILE": "#0f766e",   # Dark Teal
    "C2_SERVER": "#991b1b",      # Dark Red
    "ORGANIZATION": "#475569",   # Slate
    "VULNERABILITY": "#d97706",  # Amber
    "ATTACK_TECHNIQUE": "#dc2626", # Red
    "TOOL": "#059669",           # Emerald
    "FILE_HASH": "#475569",      # Slate
    "NETWORK_CONNECTION": "#0284c7" # Sky
}

RELATIONSHIP_LABEL_MAP = {
    "SENT_TO": "Sends To",
    "SENT_EMAIL": "Sends Email",
    "CONTAINS_ATTACHMENT": "Contains Attachment",
    "CONTAINS_URL": "Contains URL",
    "DOWNLOADED_FROM": "Downloads From",
    "EXECUTED_BY": "Executes",
    "SPAWNED_PROCESS": "Spawns Process",
    "CONNECTED_TO": "Connects To",
    "RESOLVES_TO": "Resolves To",
    "DROPPED_FILE": "Drops File",
    "MODIFIED_REGISTRY": "Modifies Registry",
    "CREATED_SCHEDULED_TASK": "Creates Task",
    "EXPLOITED_VULNERABILITY": "Exploits",
    "COMMUNICATED_WITH_C2": "Communicates With C2",
    "EXFILTRATED_DATA": "Exfiltrates Data",
    "ASSOCIATED_WITH": "Associated With",
}

class AttackGraphBuilder:
    """
    Constructs, analyzes, and sequences directed attack graphs using NetworkX.
    Exports React Flow-ready graph topologies with hierarchical layouts,
    cycle detection, component analysis, and stage attribution.
    """

    def __init__(self):
        pass

    def build_graph(
        self,
        report_id: str,
        entities: List[Dict[str, Any]],
        relationships: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        G = nx.DiGraph()

        entity_dict = {e["id"]: e for e in entities}

        # 1. Add nodes to NetworkX
        for entity in entities:
            e_id = entity["id"]
            e_type = entity.get("entity_type", "FILE")
            G.add_node(
                e_id,
                entity_type=e_type,
                name=entity.get("original_value", ""),
                normalized=entity.get("normalized_value", ""),
                stage=entity.get("attack_stage", "Execution"),
                confidence=entity.get("confidence_score", 1.0),
                evidence=entity.get("evidence_sentence", "")
            )

        # 2. Add edges to NetworkX
        unresolved_count = 0
        for rel in relationships:
            s_id = rel.get("source_entity_id")
            t_id = rel.get("target_entity_id")
            if s_id in entity_dict and t_id in entity_dict and s_id != t_id:
                G.add_edge(
                    s_id,
                    t_id,
                    id=rel.get("id"),
                    rel_type=rel.get("relationship_type", "ASSOCIATED_WITH"),
                    label=rel.get("relationship_type", "").replace("_", " ").title(),
                    evidence=rel.get("evidence_sentence", ""),
                    confidence=rel.get("confidence_score", 1.0),
                    classification=rel.get("classification", "observed"),
                    validation_status=rel.get("validation_status", "unreviewed")
                )
                if rel.get("validation_status") == "uncertain" or rel.get("classification") == "inferred":
                    unresolved_count += 1

        # 3. Analyze graph structure with NetworkX
        connected_components = list(nx.weakly_connected_components(G))
        comp_count = len(connected_components)

        detected_cycles = []
        try:
            detected_cycles = list(nx.simple_cycles(G))
        except Exception:
            pass

        # 4. Identify supported attack stages
        active_stages = set()
        for _, data in G.nodes(data=True):
            stage = data.get("stage")
            if stage:
                active_stages.add(stage)
        ordered_stages = [s for s in STAGE_ORDER if s in active_stages]

        # 5. Compute Hierarchical Layout Coordinates for React Flow
        positions = self._compute_layout(G, entities, relationships)

        # 6. Format Nodes for React Flow
        rf_nodes = []
        for e in entities:
            e_id = e["id"]
            e_type = e.get("entity_type", "FILE")
            color = CATEGORY_COLORS.get(e_type, "#94a3b8")
            icon = CATEGORY_ICONS.get(e_type, "File")
            pos = positions.get(e_id, {"x": 100.0, "y": 100.0})

            # Truncate label for graph canvas, full value in data
            raw_label = e.get("original_value", "")
            disp_label = (raw_label[:28] + "...") if len(raw_label) > 30 else raw_label

            rf_nodes.append({
                "id": e_id,
                "type": "ctiNode",
                "position": pos,
                "data": {
                    "id": e_id,
                    "label": disp_label,
                    "full_name": raw_label,
                    "entity_type": e_type,
                    "stage": e.get("attack_stage") or "Execution",
                    "confidence": e.get("confidence_score", 1.0),
                    "evidence": e.get("evidence_sentence", ""),
                    "paragraph_index": e.get("paragraph_index", 0),
                    "color": color,
                    "icon": icon,
                    "extraction_method": e.get("extraction_method", "Transformer/CTI Engine")
                }
            })

        # 7. Format Edges for React Flow
        rf_edges = []
        for rel in relationships:
            rel_id = rel.get("id")
            s_id = rel.get("source_entity_id")
            t_id = rel.get("target_entity_id")
            if s_id in entity_dict and t_id in entity_dict:
                classification = rel.get("classification", "observed")
                is_inferred = classification == "inferred"
                rel_type = rel.get("relationship_type", "CONNECTED")
                human_label = RELATIONSHIP_LABEL_MAP.get(rel_type, rel_type.replace("_", " ").title())

                rf_edges.append({
                    "id": rel_id,
                    "source": s_id,
                    "target": t_id,
                    "label": human_label,
                    "type": "ctiEdge",
                    "animated": is_inferred,
                    "data": {
                        "id": rel_id,
                        "relationship_type": rel_type,
                        "label": human_label,
                        "evidence": rel.get("evidence_sentence", ""),
                        "confidence": rel.get("confidence_score", 1.0),
                        "classification": classification,
                        "validation_status": rel.get("validation_status", "unreviewed"),
                        "source_name": entity_dict[s_id]["original_value"],
                        "target_name": entity_dict[t_id]["original_value"]
                    }
                })

        return {
            "report_id": report_id,
            "nodes": rf_nodes,
            "edges": rf_edges,
            "stages": ordered_stages,
            "connected_components_count": comp_count,
            "detected_cycles_count": len(detected_cycles),
            "unresolved_relationships_count": unresolved_count
        }

    def _compute_layout(
        self,
        G: nx.DiGraph,
        entities: List[Dict[str, Any]],
        relationships: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, float]]:
        """
        Computes clean rank-based hierarchical positions with collision avoidance.
        Horizontal stages or topological depth along X, vertical offsets along Y.
        """
        positions = {}

        # Stage to column index
        stage_to_col = {stage: i for i, stage in enumerate(STAGE_ORDER)}

        # Group nodes by stage
        stage_buckets: Dict[int, List[str]] = {}
        for e in entities:
            stage = e.get("attack_stage", "Execution")
            col = stage_to_col.get(stage, 2)
            if col not in stage_buckets:
                stage_buckets[col] = []
            stage_buckets[col].append(e["id"])

        col_keys = sorted(stage_buckets.keys())
        # Map actual present stage columns to compact indices 0, 1, 2...
        compact_col_map = {orig_col: idx for idx, orig_col in enumerate(col_keys)}

        X_SPACING = 340.0
        Y_SPACING = 130.0

        for orig_col, node_ids in stage_buckets.items():
            col_idx = compact_col_map[orig_col]
            x = 80.0 + (col_idx * X_SPACING)
            total_in_col = len(node_ids)
            y_start = max(60.0, 300.0 - (total_in_col * Y_SPACING / 2.0))

            for row_idx, n_id in enumerate(node_ids):
                y = y_start + (row_idx * Y_SPACING)
                positions[n_id] = {"x": round(x, 1), "y": round(y, 1)}

        return positions
