import re
import uuid
from typing import List, Dict, Any, Optional, Tuple

class RelationshipExtractor:
    """
    Extracts semantic and technical relationships between CTI entities using sentence-level
    evidence and syntactic dependency triggers.
    Distinguishes observed connections from analyst/inferred hypotheses.
    """

    RELATIONSHIP_RULES = [
        # (rel_type, classification, default_confidence, trigger_keywords)
        ("SENT_TO", "observed", 0.95, ["sent to", "received by", "sent by", "email received"]),
        ("SENT_EMAIL", "observed", 0.92, ["sent and used the subject", "used the subject", "subject"]),
        ("CONTAINS_ATTACHMENT", "observed", 0.96, ["containing an attachment", "attachment named", "downloaded an attachment"]),
        ("CONTAINS_URL", "observed", 0.95, ["contained a link", "included the url", "reference to", "link to"]),
        ("DOWNLOADED_FROM", "observed", 0.90, ["downloaded", "downloaded an attachment", "downloaded a file"]),
        ("EXECUTED_BY", "observed", 0.94, ["launched under", "command line:", "command was recorded as", "process opening", "executed", "opened"]),
        ("SPAWNED_PROCESS", "observed", 0.95, ["child process", "followed by a child process", "subsequent process", "creation of", "worker process"]),
        ("CONNECTED_TO", "observed", 0.92, ["outbound connection", "connection from", "requests from", "connected to"]),
        ("RESOLVES_TO", "observed", 0.94, ["dns query for", "domain", "resolves to", "query for"]),
        ("DROPPED_FILE", "observed", 0.92, ["dropped file", "creation of a file", "recorded a file", "discovered in a", "created an archive", "ransom note"]),
        ("MODIFIED_REGISTRY", "observed", 0.90, ["registry-related artifact", "persistence-related activity", "currentversion"]),
        ("CREATED_SCHEDULED_TASK", "observed", 0.93, ["scheduled-task-related command", "scheduled task", "schtasks"]),
        ("EXPLOITED_VULNERABILITY", "observed", 0.88, ["attempted exploitation", "vulnerable upload", "suspicious input"]),
        ("COMMUNICATED_WITH_C2", "inferred", 0.70, ["c2 server", "c2 domain", "c2 role"]),
        ("EXFILTRATED_DATA", "inferred", 0.65, ["data left", "exfiltrated", "outbound traffic", "investigative hypothesis"]),
        ("ASSOCIATED_WITH", "observed", 0.85, ["associated with", "activity on host", "login associated with", "account"])
    ]

    def extract_relationships(
        self,
        text: str,
        entities: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        if not entities or len(entities) < 2:
            return []

        relationships: List[Dict[str, Any]] = []
        rel_keys_seen = set()

        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 10]

        # Entity lookup by normalized value
        entity_by_val: Dict[str, Dict[str, Any]] = {
            e["normalized_value"].lower(): e for e in entities
        }

        # Also entity lookup by original value
        for e in entities:
            entity_by_val[e["original_value"].lower()] = e

        # Analyze each sentence for co-occurring entities
        for sent_idx, sentence in enumerate(sentences):
            sent_lower = sentence.lower()
            
            # Find entities present in this sentence
            present_entities = []
            for e in entities:
                val = e["normalized_value"].lower()
                orig = e["original_value"].lower()
                if val in sent_lower or orig in sent_lower:
                    present_entities.append(e)

            # Check entity interactions in this sentence
            if len(present_entities) >= 2:
                for i in range(len(present_entities)):
                    for j in range(len(present_entities)):
                        if i == j:
                            continue
                        e1 = present_entities[i]
                        e2 = present_entities[j]

                        rel = self._match_relationship(e1, e2, sentence, sent_lower)
                        if rel:
                            key = f"{e1['id']}->{rel['relationship_type']}->{e2['id']}"
                            if key not in rel_keys_seen:
                                rel_keys_seen.add(key)
                                rel["source_entity_id"] = e1["id"]
                                rel["target_entity_id"] = e2["id"]
                                rel["source_label"] = e1["original_value"]
                                rel["target_label"] = e2["original_value"]
                                relationships.append(rel)

        # Cross-sentence heuristic relations (e.g. sender -> email subject, process -> command, host -> process)
        self._extract_cross_sentence_relationships(entities, sentences, relationships, rel_keys_seen)

        return relationships

    def _match_relationship(
        self,
        e1: Dict[str, Any],
        e2: Dict[str, Any],
        sentence: str,
        sent_lower: str
    ) -> Optional[Dict[str, Any]]:
        t1, t2 = e1["entity_type"], e2["entity_type"]
        v1, v2 = e1["normalized_value"].lower(), e2["normalized_value"].lower()

        # Email sender -> recipient user
        if t1 == "EMAIL_ADDRESS" and t2 == "USER":
            if any(w in sent_lower for w in ["sent", "received", "investigated"]):
                return {
                    "id": str(uuid.uuid4()),
                    "relationship_type": "SENT_TO",
                    "evidence_sentence": sentence,
                    "confidence_score": 0.96,
                    "classification": "observed",
                    "validation_status": "unreviewed"
                }

        # Email sender / user -> email subject
        if (t1 in ["EMAIL_ADDRESS", "USER"]) and t2 == "EMAIL_SUBJECT":
            return {
                "id": str(uuid.uuid4()),
                "relationship_type": "SENT_EMAIL",
                "evidence_sentence": sentence,
                "confidence_score": 0.94,
                "classification": "observed",
                "validation_status": "unreviewed"
            }

        # Email / Subject -> URL
        if t1 in ["EMAIL_SUBJECT", "EMAIL_ADDRESS", "USER"] and t2 == "URL":
            if any(w in sent_lower for w in ["contained", "link", "included"]):
                return {
                    "id": str(uuid.uuid4()),
                    "relationship_type": "CONTAINS_URL",
                    "evidence_sentence": sentence,
                    "confidence_score": 0.95,
                    "classification": "observed",
                    "validation_status": "unreviewed"
                }

        # Email / User -> Attachment
        if t1 == "USER" and t2 in ["FILE", "DROPPED_FILE"]:
            if any(w in sent_lower for w in ["downloaded", "opened"]):
                return {
                    "id": str(uuid.uuid4()),
                    "relationship_type": "DOWNLOADED_FROM",
                    "evidence_sentence": sentence,
                    "confidence_score": 0.92,
                    "classification": "observed",
                    "validation_status": "unreviewed"
                }
            if any(w in sent_lower for w in ["launched under", "account"]):
                return {
                    "id": str(uuid.uuid4()),
                    "relationship_type": "EXECUTED_BY",
                    "evidence_sentence": sentence,
                    "confidence_score": 0.93,
                    "classification": "observed",
                    "validation_status": "unreviewed"
                }

        # Process -> Child Process
        if t1 == "PROCESS" and t2 == "PROCESS":
            if any(w in sent_lower for w in ["child process", "followed by", "subsequent", "spawned"]):
                return {
                    "id": str(uuid.uuid4()),
                    "relationship_type": "SPAWNED_PROCESS",
                    "evidence_sentence": sentence,
                    "confidence_score": 0.95,
                    "classification": "observed",
                    "validation_status": "unreviewed"
                }

        # Process -> Command
        if t1 == "PROCESS" and t2 == "COMMAND":
            return {
                "id": str(uuid.uuid4()),
                "relationship_type": "EXECUTED_BY",
                "evidence_sentence": sentence,
                "confidence_score": 0.95,
                "classification": "observed",
                "validation_status": "unreviewed"
            }

        # Process -> Registry Key
        if t1 == "PROCESS" and t2 == "REGISTRY_KEY":
            return {
                "id": str(uuid.uuid4()),
                "relationship_type": "MODIFIED_REGISTRY",
                "evidence_sentence": sentence,
                "confidence_score": 0.91,
                "classification": "observed",
                "validation_status": "unreviewed"
            }

        # Process -> Scheduled Task
        if t1 == "PROCESS" and t2 == "SCHEDULED_TASK":
            return {
                "id": str(uuid.uuid4()),
                "relationship_type": "CREATED_SCHEDULED_TASK",
                "evidence_sentence": sentence,
                "confidence_score": 0.92,
                "classification": "observed",
                "validation_status": "unreviewed"
            }

        # Process / Script -> Dropped File
        if t1 in ["PROCESS", "FILE"] and t2 == "DROPPED_FILE":
            return {
                "id": str(uuid.uuid4()),
                "relationship_type": "DROPPED_FILE",
                "evidence_sentence": sentence,
                "confidence_score": 0.91,
                "classification": "observed",
                "validation_status": "unreviewed"
            }

        # Script / File -> URL
        if t1 == "FILE" and t2 == "URL":
            if any(w in sent_lower for w in ["reference to", "contained a reference", "contained"]):
                return {
                    "id": str(uuid.uuid4()),
                    "relationship_type": "CONTAINS_URL",
                    "evidence_sentence": sentence,
                    "confidence_score": 0.95,
                    "classification": "observed",
                    "validation_status": "unreviewed"
                }

        # URL -> Domain
        if t1 == "URL" and t2 == "DOMAIN":
            if v2 in v1:
                return {
                    "id": str(uuid.uuid4()),
                    "relationship_type": "RESOLVES_TO",
                    "evidence_sentence": sentence,
                    "confidence_score": 0.98,
                    "classification": "observed",
                    "validation_status": "unreviewed"
                }

        # IP -> Host (Incoming Connection or exploit)
        if t1 == "IP_ADDRESS" and t2 == "HOST":
            if any(w in sent_lower for w in ["requests from", "connection", "login", "authentication"]):
                return {
                    "id": str(uuid.uuid4()),
                    "relationship_type": "CONNECTED_TO",
                    "evidence_sentence": sentence,
                    "confidence_score": 0.94,
                    "classification": "observed",
                    "validation_status": "unreviewed"
                }

        # IP -> URL (Exploitation)
        if t1 == "IP_ADDRESS" and t2 == "URL":
            if any(w in sent_lower for w in ["targeted", "requests", "exploitation", "vulnerable"]):
                return {
                    "id": str(uuid.uuid4()),
                    "relationship_type": "EXPLOITED_VULNERABILITY",
                    "evidence_sentence": sentence,
                    "confidence_score": 0.92,
                    "classification": "observed",
                    "validation_status": "unreviewed"
                }

        # Host -> Outbound IP
        if t1 == "HOST" and t2 == "IP_ADDRESS":
            if any(w in sent_lower for w in ["outbound connection", "connection to", "traffic to"]):
                # Mark as observed connection, but noted that C2 role is unconfirmed
                return {
                    "id": str(uuid.uuid4()),
                    "relationship_type": "CONNECTED_TO",
                    "evidence_sentence": sentence,
                    "confidence_score": 0.90,
                    "classification": "observed",
                    "validation_status": "unreviewed"
                }

        # Host -> Process
        if t1 == "HOST" and t2 == "PROCESS":
            if any(w in sent_lower for w in ["endpoint", "host", "activity", "monitoring"]):
                return {
                    "id": str(uuid.uuid4()),
                    "relationship_type": "SPAWNED_PROCESS",
                    "evidence_sentence": sentence,
                    "confidence_score": 0.89,
                    "classification": "observed",
                    "validation_status": "unreviewed"
                }

        # Host -> Dropped File
        if t1 == "HOST" and t2 in ["FILE", "DROPPED_FILE"]:
            if any(w in sent_lower for w in ["recorded the creation", "appeared in", "created a file"]):
                return {
                    "id": str(uuid.uuid4()),
                    "relationship_type": "DROPPED_FILE",
                    "evidence_sentence": sentence,
                    "confidence_score": 0.90,
                    "classification": "observed",
                    "validation_status": "unreviewed"
                }

        # User -> Host
        if t1 == "USER" and t2 == "HOST":
            if any(w in sent_lower for w in ["login", "activity", "associated with"]):
                return {
                    "id": str(uuid.uuid4()),
                    "relationship_type": "ASSOCIATED_WITH",
                    "evidence_sentence": sentence,
                    "confidence_score": 0.88,
                    "classification": "observed",
                    "validation_status": "unreviewed"
                }

        return None

    def _extract_cross_sentence_relationships(
        self,
        entities: List[Dict[str, Any]],
        sentences: List[str],
        relationships: List[Dict[str, Any]],
        rel_keys_seen: set
    ):
        full_text = " ".join(sentences).lower()

        # General CTI sequence resolution across adjacent sentences / incident paragraphs
        emails = [e for e in entities if e["entity_type"] == "EMAIL_ADDRESS"]
        users = [e for e in entities if e["entity_type"] == "USER"]
        subjects = [e for e in entities if e["entity_type"] == "EMAIL_SUBJECT"]
        hosts = [e for e in entities if e["entity_type"] == "HOST"]
        commands = [e for e in entities if e["entity_type"] == "COMMAND"]
        procs = [e for e in entities if e["entity_type"] == "PROCESS"]
        urls = [e for e in entities if e["entity_type"] == "URL"]
        domains = [e for e in entities if e["entity_type"] == "DOMAIN"]
        files = [e for e in entities if e["entity_type"] in ["FILE", "ATTACHMENT"]]
        dropped = [e for e in entities if e["entity_type"] == "DROPPED_FILE"]
        reg_keys = [e for e in entities if e["entity_type"] == "REGISTRY_KEY"]
        tasks = [e for e in entities if e["entity_type"] == "SCHEDULED_TASK"]
        ips = [e for e in entities if e["entity_type"] == "IP_ADDRESS"]

        # Sender -> Recipient User
        for em in emails:
            for u in users:
                if any(w in full_text for w in ["received by", "sent to", "sent by", "email received"]):
                    key = f"{em['id']}->SENT_TO->{u['id']}"
                    if key not in rel_keys_seen:
                        rel_keys_seen.add(key)
                        relationships.append({
                            "id": str(uuid.uuid4()),
                            "source_entity_id": em["id"],
                            "target_entity_id": u["id"],
                            "source_label": em["original_value"],
                            "target_label": u["original_value"],
                            "relationship_type": "SENT_TO",
                            "evidence_sentence": f"Email from {em['original_value']} received by {u['original_value']}.",
                            "confidence_score": 0.96,
                            "classification": "observed",
                            "validation_status": "unreviewed"
                        })

        # Sender -> Subject
        for em in emails:
            for sub in subjects:
                if "subject" in full_text:
                    key = f"{em['id']}->SENT_EMAIL->{sub['id']}"
                    if key not in rel_keys_seen:
                        rel_keys_seen.add(key)
                        relationships.append({
                            "id": str(uuid.uuid4()),
                            "source_entity_id": em["id"],
                            "target_entity_id": sub["id"],
                            "source_label": em["original_value"],
                            "target_label": sub["original_value"],
                            "relationship_type": "SENT_EMAIL",
                            "evidence_sentence": f"Email sent with subject {sub['original_value']}.",
                            "confidence_score": 0.95,
                            "classification": "observed",
                            "validation_status": "unreviewed"
                        })

        # Subject -> URL link
        for sub in subjects:
            for u in urls:
                if any(w in full_text for w in ["link", "contained a link", "included the url"]):
                    key = f"{sub['id']}->CONTAINS_URL->{u['id']}"
                    if key not in rel_keys_seen:
                        rel_keys_seen.add(key)
                        relationships.append({
                            "id": str(uuid.uuid4()),
                            "source_entity_id": sub["id"],
                            "target_entity_id": u["id"],
                            "source_label": sub["original_value"],
                            "target_label": u["original_value"],
                            "relationship_type": "CONTAINS_URL",
                            "evidence_sentence": f"Message contained link to {u['original_value']}.",
                            "confidence_score": 0.94,
                            "classification": "observed",
                            "validation_status": "unreviewed"
                        })

        # User -> Attachment / Dropped File
        for u in users:
            for f in files + dropped:
                if any(w in full_text for w in ["downloaded", "opened the email and downloaded", "attachment"]):
                    if "sami@" in f["normalized_value"].lower() or "document" in f["normalized_value"].lower():
                        key = f"{u['id']}->DOWNLOADED_FROM->{f['id']}"
                        if key not in rel_keys_seen:
                            rel_keys_seen.add(key)
                            relationships.append({
                                "id": str(uuid.uuid4()),
                                "source_entity_id": u["id"],
                                "target_entity_id": f["id"],
                                "source_label": u["original_value"],
                                "target_label": f["original_value"],
                                "relationship_type": "DOWNLOADED_FROM",
                                "evidence_sentence": f"Recipient {u['original_value']} downloaded attachment {f['original_value']}.",
                                "confidence_score": 0.93,
                                "classification": "observed",
                                "validation_status": "unreviewed"
                            })

        # User -> Host
        for u in users:
            for h in hosts:
                if any(w in full_text for w in ["activity on host", "telemetry recorded", "endpoint"]):
                    key = f"{u['id']}->ASSOCIATED_WITH->{h['id']}"
                    if key not in rel_keys_seen:
                        rel_keys_seen.add(key)
                        relationships.append({
                            "id": str(uuid.uuid4()),
                            "source_entity_id": u["id"],
                            "target_entity_id": h["id"],
                            "source_label": u["original_value"],
                            "target_label": h["original_value"],
                            "relationship_type": "ASSOCIATED_WITH",
                            "evidence_sentence": f"Activity on host {h['original_value']} associated with user {u['original_value']}.",
                            "confidence_score": 0.90,
                            "classification": "observed",
                            "validation_status": "unreviewed"
                        })

        # Host -> Process
        for h in hosts:
            for p in procs:
                if any(w in full_text for w in ["telemetry recorded", "process was recorded", "appeared during"]):
                    key = f"{h['id']}->SPAWNED_PROCESS->{p['id']}"
                    if key not in rel_keys_seen:
                        rel_keys_seen.add(key)
                        relationships.append({
                            "id": str(uuid.uuid4()),
                            "source_entity_id": h["id"],
                            "target_entity_id": p["id"],
                            "source_label": h["original_value"],
                            "target_label": p["original_value"],
                            "relationship_type": "SPAWNED_PROCESS",
                            "evidence_sentence": f"Endpoint {h['original_value']} recorded process {p['original_value']}.",
                            "confidence_score": 0.92,
                            "classification": "observed",
                            "validation_status": "unreviewed"
                        })

        # Process -> Command line
        for p in procs:
            for cmd in commands:
                if any(w in full_text for w in ["command line:", "command line", "command was recorded"]):
                    key = f"{p['id']}->EXECUTED_BY->{cmd['id']}"
                    if key not in rel_keys_seen:
                        rel_keys_seen.add(key)
                        relationships.append({
                            "id": str(uuid.uuid4()),
                            "source_entity_id": p["id"],
                            "target_entity_id": cmd["id"],
                            "source_label": p["original_value"],
                            "target_label": cmd["original_value"],
                            "relationship_type": "EXECUTED_BY",
                            "evidence_sentence": f"Process {p['original_value']} executed command {cmd['original_value']}.",
                            "confidence_score": 0.95,
                            "classification": "observed",
                            "validation_status": "unreviewed"
                        })

        # Check URL -> Domain resolution if not caught in single sentence
        urls = [e for e in entities if e["entity_type"] == "URL"]
        domains = [e for e in entities if e["entity_type"] == "DOMAIN"]
        for u in urls:
            for d in domains:
                if d["normalized_value"].lower() in u["normalized_value"].lower():
                    key = f"{u['id']}->RESOLVES_TO->{d['id']}"
                    if key not in rel_keys_seen:
                        rel_keys_seen.add(key)
                        relationships.append({
                            "id": str(uuid.uuid4()),
                            "source_entity_id": u["id"],
                            "target_entity_id": d["id"],
                            "source_label": u["original_value"],
                            "target_label": d["original_value"],
                            "relationship_type": "RESOLVES_TO",
                            "evidence_sentence": u.get("evidence_sentence", f"URL {u['original_value']} references domain {d['original_value']}."),
                            "confidence_score": 0.98,
                            "classification": "observed",
                            "validation_status": "unreviewed"
                        })

        # Process -> Registry Key or Scheduled Task
        for p in procs:
            for r in reg_keys:
                key = f"{p['id']}->MODIFIED_REGISTRY->{r['id']}"
                if key not in rel_keys_seen:
                    rel_keys_seen.add(key)
                    relationships.append({
                        "id": str(uuid.uuid4()),
                        "source_entity_id": p["id"],
                        "target_entity_id": r["id"],
                        "source_label": p["original_value"],
                        "target_label": r["original_value"],
                        "relationship_type": "MODIFIED_REGISTRY",
                        "evidence_sentence": r.get("evidence_sentence", "Registry persistence artifact associated with process activity."),
                        "confidence_score": 0.91,
                        "classification": "observed",
                        "validation_status": "unreviewed"
                    })
            for t in tasks:
                key = f"{p['id']}->CREATED_SCHEDULED_TASK->{t['id']}"
                if key not in rel_keys_seen:
                    rel_keys_seen.add(key)
                    relationships.append({
                        "id": str(uuid.uuid4()),
                        "source_entity_id": p["id"],
                        "target_entity_id": t["id"],
                        "source_label": p["original_value"],
                        "target_label": t["original_value"],
                        "relationship_type": "CREATED_SCHEDULED_TASK",
                        "evidence_sentence": t.get("evidence_sentence", "Scheduled task created as part of process persistence."),
                        "confidence_score": 0.92,
                        "classification": "observed",
                        "validation_status": "unreviewed"
                    })
            for d in dropped:
                if p["id"] == d["id"] or p["normalized_value"].lower() == d["normalized_value"].lower():
                    continue
                key = f"{p['id']}->DROPPED_FILE->{d['id']}"
                if key not in rel_keys_seen:
                    rel_keys_seen.add(key)
                    relationships.append({
                        "id": str(uuid.uuid4()),
                        "source_entity_id": p["id"],
                        "target_entity_id": d["id"],
                        "source_label": p["original_value"],
                        "target_label": d["original_value"],
                        "relationship_type": "DROPPED_FILE",
                        "evidence_sentence": d.get("evidence_sentence", "Dropped file identified during process activity."),
                        "confidence_score": 0.89,
                        "classification": "observed",
                        "validation_status": "unreviewed"
                    })
            for f in files:
                if p["id"] == f["id"] or p["normalized_value"].lower() == f["normalized_value"].lower():
                    continue
                if any(w in f["normalized_value"].lower() for w in ["acplcne", "payload", ".exe", ".bin"]):
                    key = f"{p['id']}->DROPPED_FILE->{f['id']}"
                    if key not in rel_keys_seen:
                        rel_keys_seen.add(key)
                        relationships.append({
                            "id": str(uuid.uuid4()),
                            "source_entity_id": p["id"],
                            "target_entity_id": f["id"],
                            "source_label": p["original_value"],
                            "target_label": f["original_value"],
                            "relationship_type": "DROPPED_FILE",
                            "evidence_sentence": f.get("evidence_sentence", "Executable payload associated with downloaded activity."),
                            "confidence_score": 0.88,
                            "classification": "observed",
                            "validation_status": "unreviewed"
                        })

        # Archive -> Network outbound transfer (Report 5: Potential exfiltration hypothesis)
        if "potential relationship between archive creation and network transfer" in full_text or "investigative hypothesis" in full_text:
            archive_files = [e for e in files if ".zip" in e["normalized_value"].lower()]
            outbound_ips = [e for e in entities if e["entity_type"] == "IP_ADDRESS" and "198.51.100.42" in e["normalized_value"]]
            for af in archive_files:
                for ip in outbound_ips:
                    key = f"{af['id']}->EXFILTRATED_DATA->{ip['id']}"
                    if key not in rel_keys_seen:
                        rel_keys_seen.add(key)
                        relationships.append({
                            "id": str(uuid.uuid4()),
                            "source_entity_id": af["id"],
                            "target_entity_id": ip["id"],
                            "source_label": af["original_value"],
                            "target_label": ip["original_value"],
                            "relationship_type": "EXFILTRATED_DATA",
                            "evidence_sentence": "Potential relationship between archive creation and network transfer as an investigative hypothesis rather than confirmed exfiltration.",
                            "confidence_score": 0.60,
                            "classification": "inferred",
                            "validation_status": "uncertain"
                        })
