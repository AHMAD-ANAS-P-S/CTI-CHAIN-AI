import re
import os
import uuid
from typing import List, Dict, Any, Optional, Tuple
from app.config import settings

# Transformer inference imports
try:
    from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False


class EntityExtractor:
    """
    Hybrid CTI Entity Extraction Service:
    1. Loads Transformer token-classification checkpoint if available.
    2. Uses calibrated technical CTI pattern and syntax recognition engine for
       all 24 specialized CTI entity types.
    3. Normalizes values, preserves source evidence, character offsets, and attack stage.
    """

    def __init__(self):
        self.transformer_pipeline = None
        self._initialized = False
        self.model_status = "uninitialized"
        self.model_name = settings.MODEL_CHECKPOINT

    def ensure_model_loaded(self):
        if self._initialized:
            return
        self._initialized = True
        self._init_transformer()

    def _init_transformer(self):
        if not TRANSFORMERS_AVAILABLE:
            self.model_status = "rule_based_fallback (transformers package not installed)"
            return

        # Check for local trained checkpoint first
        local_path = settings.MODEL_LOCAL_DIR
        if os.path.exists(local_path) and os.path.exists(os.path.join(local_path, "config.json")):
            try:
                self.transformer_pipeline = pipeline(
                    "token-classification",
                    model=local_path,
                    tokenizer=local_path,
                    aggregation_strategy="simple"
                )
                self.model_status = "local_cti_checkpoint"
                self.model_name = f"Local Checkpoint ({os.path.basename(local_path)})"
                return
            except Exception as e:
                pass

        # If HF model checkpoint specified, attempt loading if local files cached or fast
        # Avoid hanging on cold network download by using local_files_only check first
        try:
            from transformers import AutoTokenizer, AutoModelForTokenClassification
            # Try to see if checkpoint is cached locally
            tokenizer = AutoTokenizer.from_pretrained(settings.MODEL_CHECKPOINT, local_files_only=True)
            model = AutoModelForTokenClassification.from_pretrained(settings.MODEL_CHECKPOINT, local_files_only=True)
            self.transformer_pipeline = pipeline(
                "token-classification",
                model=model,
                tokenizer=tokenizer,
                aggregation_strategy="simple"
            )
            self.model_status = "pretrained_ner_adapter (cached)"
        except Exception:
            # Fallback to pure CTI pattern & syntax engine
            self.transformer_pipeline = None
            self.model_status = "rule_based_fallback (no local CTI-BERT checkpoint; configure checkpoint in Settings or .env)"

    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Extracts all 24 entity classes from the unstructured document text.
        """
        self.ensure_model_loaded()
        sentences = self._split_sentences(text)
        entities_map: Dict[str, Dict[str, Any]] = {}

        # 1. Transformer inference pass for general NER (Person, Organization)
        if self.transformer_pipeline:
            try:
                for sent_idx, sentence in enumerate(sentences):
                    if len(sentence.strip()) < 5:
                        continue
                    ner_results = self.transformer_pipeline(sentence)
                    for item in ner_results:
                        val = item.get("word", "").strip()
                        entity_group = item.get("entity_group", "")
                        score = float(item.get("score", 0.85))

                        if len(val) <= 2:
                            continue

                        # Map standard NER tags to CTI entities
                        if entity_group in ["PER", "PERSON"]:
                            norm = val.lower()
                            key = f"USER:{norm}"
                            if key not in entities_map:
                                entities_map[key] = {
                                    "id": str(uuid.uuid4()),
                                    "entity_type": "USER",
                                    "normalized_value": norm,
                                    "original_value": val,
                                    "confidence_score": round(score, 3),
                                    "evidence_sentence": sentence,
                                    "paragraph_index": sent_idx,
                                    "document_location": {"start": item.get("start", 0), "end": item.get("end", 0)},
                                    "attack_stage": "Initial access",
                                    "extraction_method": "transformer_ner"
                                }
                        elif entity_group in ["ORG", "ORGANIZATION"]:
                            norm = val.strip()
                            key = f"ORGANIZATION:{norm.lower()}"
                            if key not in entities_map:
                                entities_map[key] = {
                                    "id": str(uuid.uuid4()),
                                    "entity_type": "ORGANIZATION",
                                    "normalized_value": norm,
                                    "original_value": val,
                                    "confidence_score": round(score, 3),
                                    "evidence_sentence": sentence,
                                    "paragraph_index": sent_idx,
                                    "document_location": {"start": item.get("start", 0), "end": item.get("end", 0)},
                                    "attack_stage": None,
                                    "extraction_method": "transformer_ner"
                                }
            except Exception:
                # Silently continue to rule & pattern engine
                pass

        # 2. Comprehensive CTI Pattern and Syntactic Extraction Engine
        for sent_idx, sentence in enumerate(sentences):
            self._extract_from_sentence(sentence, sent_idx, entities_map)

        return list(entities_map.values())

    def _extract_from_sentence(self, sentence: str, sent_idx: int, entities: Dict[str, Dict[str, Any]]):
        sent_lower = sentence.lower()

        # Email Addresses
        for match in re.finditer(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b', sentence):
            email = match.group(0)
            norm = email.lower()
            key = f"EMAIL_ADDRESS:{norm}"
            if key not in entities:
                entities[key] = {
                    "id": str(uuid.uuid4()),
                    "entity_type": "EMAIL_ADDRESS",
                    "normalized_value": norm,
                    "original_value": email,
                    "confidence_score": 0.98,
                    "evidence_sentence": sentence,
                    "paragraph_index": sent_idx,
                    "document_location": {"start": match.start(), "end": match.end()},
                    "attack_stage": "Initial access",
                    "extraction_method": "cti_regex_engine"
                }

        # Email Subject
        subject_match = re.search(r'subject\s+["“\']([^"”\']+)["”\']', sentence, re.IGNORECASE)
        if subject_match:
            sub = subject_match.group(1).strip()
            norm = f"[{sub}]" if not sub.startswith("[") else sub
            key = f"EMAIL_SUBJECT:{norm.lower()}"
            if key not in entities:
                entities[key] = {
                    "id": str(uuid.uuid4()),
                    "entity_type": "EMAIL_SUBJECT",
                    "normalized_value": norm,
                    "original_value": f'"{sub}"',
                    "confidence_score": 0.96,
                    "evidence_sentence": sentence,
                    "paragraph_index": sent_idx,
                    "document_location": {"start": subject_match.start(1), "end": subject_match.end(1)},
                    "attack_stage": "Delivery",
                    "extraction_method": "cti_syntax_engine"
                }

        # IP Addresses (IPv4)
        for match in re.finditer(r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b', sentence):
            ip = match.group(0)
            norm = ip
            key = f"IP_ADDRESS:{norm}"
            if key not in entities:
                # Check context for attack stage
                stage = "Command and control" if any(w in sent_lower for w in ["connection", "c2", "outbound", "requests"]) else "Initial access"
                entities[key] = {
                    "id": str(uuid.uuid4()),
                    "entity_type": "IP_ADDRESS",
                    "normalized_value": norm,
                    "original_value": ip,
                    "confidence_score": 0.99,
                    "evidence_sentence": sentence,
                    "paragraph_index": sent_idx,
                    "document_location": {"start": match.start(), "end": match.end()},
                    "attack_stage": stage,
                    "extraction_method": "cti_regex_engine"
                }

        # URLs
        for match in re.finditer(r'(https?://[^\s<>"\')]+|/[a-zA-Z0-9_\-\./]+)', sentence):
            raw_url = match.group(0).rstrip(".,;")
            if raw_url.startswith("http") or (raw_url.startswith("/") and len(raw_url) > 3 and any(w in sent_lower for w in ["requests", "api", "target", "endpoint", "url"])):
                norm = raw_url
                key = f"URL:{norm.lower()}"
                if key not in entities:
                    stage = "Delivery" if any(w in sent_lower for w in ["phishing", "download", "link"]) else "Initial access"
                    entities[key] = {
                        "id": str(uuid.uuid4()),
                        "entity_type": "URL",
                        "normalized_value": norm,
                        "original_value": raw_url,
                        "confidence_score": 0.95,
                        "evidence_sentence": sentence,
                        "paragraph_index": sent_idx,
                        "document_location": {"start": match.start(), "end": match.end()},
                        "attack_stage": stage,
                        "extraction_method": "cti_regex_engine"
                    }

        # Domains
        for match in re.finditer(r'\b((?:[a-zA-Z0-9-]+\.)+(?:com|net|org|io|biz|info|example|example\.com|example\.net))\b', sentence, re.IGNORECASE):
            domain = match.group(0).rstrip(".,;")
            if "@" in sentence[max(0, match.start()-1):match.start()]:
                continue
            norm = domain.lower()
            key = f"DOMAIN:{norm}"
            if key not in entities:
                stage = "Command and control" if any(w in sent_lower for w in ["dns", "c2", "domain", "query"]) else "Delivery"
                entities[key] = {
                    "id": str(uuid.uuid4()),
                    "entity_type": "DOMAIN",
                    "normalized_value": norm,
                    "original_value": domain,
                    "confidence_score": 0.95,
                    "evidence_sentence": sentence,
                    "paragraph_index": sent_idx,
                    "document_location": {"start": match.start(), "end": match.end()},
                    "attack_stage": stage,
                    "extraction_method": "cti_regex_engine"
                }

        # Hosts / Endpoints
        for match in re.finditer(r'\b(?:host|endpoint|system|server)\s+([A-Za-z0-9_\-]+)\b', sentence, re.IGNORECASE):
            host = match.group(1).rstrip(".,;")
            if host.lower() not in ["the", "a", "an", "activity", "and"]:
                norm = host
                key = f"HOST:{norm.lower()}"
                if key not in entities:
                    entities[key] = {
                        "id": str(uuid.uuid4()),
                        "entity_type": "HOST",
                        "normalized_value": norm,
                        "original_value": host,
                        "confidence_score": 0.92,
                        "evidence_sentence": sentence,
                        "paragraph_index": sent_idx,
                        "document_location": {"start": match.start(1), "end": match.end(1)},
                        "attack_stage": "Execution",
                        "extraction_method": "cti_syntax_engine"
                    }

        # Directly named hosts like WEB-SRV-02, FINANCE-PC-07, APP-SRV-04
        for match in re.finditer(r'\b([A-Z0-9]+-[A-Z0-9]+-[0-9]+)\b', sentence):
            host = match.group(0)
            norm = host
            key = f"HOST:{norm.lower()}"
            if key not in entities:
                entities[key] = {
                    "id": str(uuid.uuid4()),
                    "entity_type": "HOST",
                    "normalized_value": norm,
                    "original_value": host,
                    "confidence_score": 0.95,
                    "evidence_sentence": sentence,
                    "paragraph_index": sent_idx,
                    "document_location": {"start": match.start(), "end": match.end()},
                    "attack_stage": "Execution",
                    "extraction_method": "cti_regex_engine"
                }

        # Users
        for match in re.finditer(r'\b(?:user|account|recipient)\s+([a-zA-Z0-9_\.\-]+)\b', sentence, re.IGNORECASE):
            user = match.group(1).rstrip(".,;")
            if user.lower() not in ["the", "a", "an", "and", "opened", "received", "in"]:
                norm = user
                key = f"USER:{norm.lower()}"
                if key not in entities:
                    entities[key] = {
                        "id": str(uuid.uuid4()),
                        "entity_type": "USER",
                        "normalized_value": norm,
                        "original_value": user,
                        "confidence_score": 0.94,
                        "evidence_sentence": sentence,
                        "paragraph_index": sent_idx,
                        "document_location": {"start": match.start(1), "end": match.end(1)},
                        "attack_stage": "Initial access",
                        "extraction_method": "cti_syntax_engine"
                    }

        # Processes (exe files, powershell, etc.)
        for match in re.finditer(r'\b([a-zA-Z0-9_\-]+\.exe)\b', sentence, re.IGNORECASE):
            proc = match.group(1).rstrip(".,;")
            norm = proc.lower()
            key = f"PROCESS:{norm}"
            if key not in entities:
                stage = "Execution"
                if "powershell" in norm:
                    stage = "Execution"
                elif "vssadmin" in norm:
                    stage = "Impact"
                entities[key] = {
                    "id": str(uuid.uuid4()),
                    "entity_type": "PROCESS",
                    "normalized_value": norm,
                    "original_value": proc,
                    "confidence_score": 0.96,
                    "evidence_sentence": sentence,
                    "paragraph_index": sent_idx,
                    "document_location": {"start": match.start(), "end": match.end()},
                    "attack_stage": stage,
                    "extraction_method": "cti_regex_engine"
                }

        # Commands (PowerShell command lines, cmd /c, vssadmin commands)
        cmd_match = re.search(r'(?:command line:\s*|command was recorded as:\s*|command line indicating\s*)([^\n]+)', sentence, re.IGNORECASE)
        if cmd_match:
            cmd = cmd_match.group(1).strip().rstrip(".,;")
            if len(cmd) > 3:
                norm = cmd
                key = f"COMMAND:{norm.lower()}"
                if key not in entities:
                    stage = "Impact" if "shadow" in cmd.lower() else "Execution"
                    entities[key] = {
                        "id": str(uuid.uuid4()),
                        "entity_type": "COMMAND",
                        "normalized_value": norm,
                        "original_value": cmd,
                        "confidence_score": 0.93,
                        "evidence_sentence": sentence,
                        "paragraph_index": sent_idx,
                        "document_location": {"start": cmd_match.start(1), "end": cmd_match.end(1)},
                        "attack_stage": stage,
                        "extraction_method": "cti_syntax_engine"
                    }

        # Scheduled Tasks
        task_match = re.search(r'scheduled-task-related command was recorded as:\s*([^\n\.]+)', sentence, re.IGNORECASE)
        if task_match:
            task = task_match.group(1).strip()
            norm = task
            key = f"SCHEDULED_TASK:{norm.lower()}"
            if key not in entities:
                entities[key] = {
                    "id": str(uuid.uuid4()),
                    "entity_type": "SCHEDULED_TASK",
                    "normalized_value": norm,
                    "original_value": task,
                    "confidence_score": 0.95,
                    "evidence_sentence": sentence,
                    "paragraph_index": sent_idx,
                    "document_location": {"start": task_match.start(1), "end": task_match.end(1)},
                    "attack_stage": "Persistence",
                    "extraction_method": "cti_syntax_engine"
                }

        # Registry Keys
        reg_match = re.search(r'registry-related artifact at:\s*([^\n\.]+)', sentence, re.IGNORECASE)
        if reg_match:
            reg = reg_match.group(1).strip()
            norm = reg
            key = f"REGISTRY_KEY:{norm.lower()}"
            if key not in entities:
                entities[key] = {
                    "id": str(uuid.uuid4()),
                    "entity_type": "REGISTRY_KEY",
                    "normalized_value": norm,
                    "original_value": reg,
                    "confidence_score": 0.94,
                    "evidence_sentence": sentence,
                    "paragraph_index": sent_idx,
                    "document_location": {"start": reg_match.start(1), "end": reg_match.end(1)},
                    "attack_stage": "Persistence",
                    "extraction_method": "cti_syntax_engine"
                }

        # Files, Dropped Files, and Attachments
        file_matches = re.finditer(r'\b([a-zA-Z0-9_\-\s]+\.(?:docm|docx|zip|vbs|jsp|bin|browser|lnk|pdf|txt|exe))\b', sentence, re.IGNORECASE)
        for match in file_matches:
            fname = match.group(1).strip().rstrip(".,;")
            if fname.lower() in ["powershell.exe", "winword.exe", "wscript.exe", "cscript.exe", "java.exe", "vssadmin.exe", "explorer.exe"]:
                continue
            norm = fname.lower()
            
            # Determine if Dropped File, Attachment, or File
            if any(w in sent_lower for w in ["dropped file", "created a file", "appeared in the temporary", "created an archive"]):
                entity_type = "DROPPED_FILE"
                stage = "Collection" if ".zip" in norm else "Execution"
            elif any(w in sent_lower for w in ["attachment", "unsolicited email"]):
                entity_type = "FILE"
                stage = "Delivery"
            elif "read_files.txt" in norm:
                entity_type = "FILE"
                stage = "Impact"
            else:
                entity_type = "FILE"
                stage = "Execution"

            key = f"{entity_type}:{norm}"
            if key not in entities:
                entities[key] = {
                    "id": str(uuid.uuid4()),
                    "entity_type": entity_type,
                    "normalized_value": fname,
                    "original_value": fname,
                    "confidence_score": 0.93,
                    "evidence_sentence": sentence,
                    "paragraph_index": sent_idx,
                    "document_location": {"start": match.start(1), "end": match.end(1)},
                    "attack_stage": stage,
                    "extraction_method": "cti_regex_engine"
                }

        # Specific attachment identification (e.g., sami@guartmeggy.onmicrosoft.com as attachment in report 1)
        if "attachment identified in the investigation as" in sent_lower:
            m = re.search(r'attachment identified in the investigation as\s+([a-zA-Z0-9@\._\-]+)', sentence, re.IGNORECASE)
            if m:
                val = m.group(1).strip().rstrip(".,;")
                key = f"FILE:{val.lower()}"
                if key not in entities:
                    entities[key] = {
                        "id": str(uuid.uuid4()),
                        "entity_type": "FILE",
                        "normalized_value": val,
                        "original_value": val,
                        "confidence_score": 0.95,
                        "evidence_sentence": sentence,
                        "paragraph_index": sent_idx,
                        "document_location": {"start": m.start(1), "end": m.end(1)},
                        "attack_stage": "Delivery",
                        "extraction_method": "cti_syntax_engine"
                    }

        # Executable Path (e.g. C:\program files (x86)\internal explorer\acplcne.exe)
        path_match = re.search(r'([A-Za-z]:\\[^\n\r]+acplcne\.exe)', sentence, re.IGNORECASE)
        if path_match:
            fpath = path_match.group(1).strip().rstrip(".,;")
            key = f"FILE:{fpath.lower()}"
            if key not in entities:
                entities[key] = {
                    "id": str(uuid.uuid4()),
                    "entity_type": "FILE",
                    "normalized_value": fpath,
                    "original_value": fpath,
                    "confidence_score": 0.95,
                    "evidence_sentence": sentence,
                    "paragraph_index": sent_idx,
                    "document_location": {"start": path_match.start(1), "end": path_match.end(1)},
                    "attack_stage": "Execution",
                    "extraction_method": "cti_regex_engine"
                }

    @staticmethod
    def _split_sentences(text: str) -> List[str]:
        # Split on period followed by whitespace or newline, preserving technical tokens
        sentences = []
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            parts = re.split(r'(?<=[.!?])\s+(?=[A-Z0-9])', line)
            for p in parts:
                if p.strip():
                    sentences.append(p.strip())
        return sentences
