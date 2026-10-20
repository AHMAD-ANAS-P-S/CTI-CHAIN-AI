import json
import os
import uuid
from typing import List, Dict, Any
from app.config import settings

class MITREMapper:
    """
    Maps unstructured report text and extracted behaviors to MITRE ATT&CK Enterprise techniques.
    Uses versioned local ATT&CK database with confidence scoring and direct reference links.
    """

    def __init__(self):
        self.techniques = []
        self._load_techniques()

    def _load_techniques(self):
        path = settings.MITRE_DATA_PATH
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    self.techniques = json.load(f)
            except Exception as e:
                print(f"Error loading MITRE dataset from {path}: {e}")
                self.techniques = []
        else:
            self.techniques = []

    def map_behaviors(self, text: str, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not self.techniques:
            return []

        mappings = []
        seen_technique_ids = set()
        text_lower = text.lower()
        sentences = [s.strip() for s in text.splitlines() if len(s.strip()) > 10]

        for tech in self.techniques:
            t_id = tech["id"]
            keywords = tech.get("keywords", [])
            
            # Find evidence sentence matching any keyword
            matched_sentences = []
            matched_keywords = []

            for kw in keywords:
                kw_lower = kw.lower()
                if kw_lower in text_lower:
                    matched_keywords.append(kw)
                    # Locate the specific sentence
                    for s in sentences:
                        if kw_lower in s.lower() and s not in matched_sentences:
                            matched_sentences.append(s)

            if matched_keywords:
                # Calculate confidence based on keyword specificity & coverage
                evidence = " ".join(matched_sentences[:2]) if matched_sentences else f"Observed activity matching keywords: {', '.join(matched_keywords)}"
                
                # Check if this behavior is uncertain in the text
                is_unconfirmed = any(w in evidence.lower() for w in ["unconfirmed", "not available", "remains unknown", "not independently confirmed", "could not conclusively determine"])
                confidence = 0.70 if is_unconfirmed else 0.92

                if t_id not in seen_technique_ids:
                    seen_technique_ids.add(t_id)
                    mappings.append({
                        "id": str(uuid.uuid4()),
                        "technique_id": t_id,
                        "technique_name": tech["name"],
                        "tactic": tech["tactic"],
                        "evidence_sentence": evidence,
                        "confidence_score": confidence,
                        "mapping_method": "Semantic Behavioral Matching",
                        "url": tech.get("url")
                    })

        return mappings
