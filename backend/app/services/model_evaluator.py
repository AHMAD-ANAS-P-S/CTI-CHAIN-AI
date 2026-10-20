import os
import json
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.config import settings
from app.services.entity_extractor import EntityExtractor
from app.services.relationship_extractor import RelationshipExtractor
from app.services.document_parser import DocumentParser

class ModelEvaluator:
    """
    Evaluates entity and relationship extraction performance against labeled ground truth.
    Strictly empirical: computes precision, recall, F1, and confusion matrix only from real data.
    """

    def __init__(self):
        self.ground_truth_path = settings.GROUND_TRUTH_PATH
        self.entity_extractor = EntityExtractor()
        self.rel_extractor = RelationshipExtractor()

    def evaluate(self) -> Dict[str, Any]:
        if not os.path.exists(self.ground_truth_path):
            return {
                "has_ground_truth": False,
                "message": "No annotated ground-truth dataset found at data/evaluation/ground_truth.json. Model evaluation requires labeled reports."
            }

        try:
            with open(self.ground_truth_path, "r", encoding="utf-8") as f:
                ground_truth_data: Dict[str, Any] = json.load(f)
        except Exception as e:
            return {
                "has_ground_truth": False,
                "message": f"Failed to load ground-truth data: {str(e)}"
            }

        if not ground_truth_data:
            return {
                "has_ground_truth": False,
                "message": "Ground-truth dataset is empty. Provide annotated reports to compute evaluation metrics."
            }

        start_time = time.time()

        # Entity metrics counters
        total_entity_tp = 0
        total_entity_fp = 0
        total_entity_fn = 0
        per_class_tp: Dict[str, int] = {}
        per_class_fp: Dict[str, int] = {}
        per_class_fn: Dict[str, int] = {}

        # Relationship metrics counters
        total_rel_tp = 0
        total_rel_fp = 0
        total_rel_fn = 0

        # Confusion Matrix [ground_truth_class][predicted_class]
        confusion_matrix: Dict[str, Dict[str, int]] = {}

        evaluated_reports_count = 0

        for filename, annotations in ground_truth_data.items():
            report_file_path = os.path.join(settings.BUILTIN_REPORTS_DIR, filename)
            if not os.path.exists(report_file_path):
                continue

            evaluated_reports_count += 1
            with open(report_file_path, "r", encoding="utf-8") as rf:
                content = rf.read()

            # Run actual inference pipeline
            extracted_entities = self.entity_extractor.extract_entities(content)
            extracted_rels = self.rel_extractor.extract_relationships(content, extracted_entities)

            # Ground truth entities & relationships
            gt_entities = annotations.get("entities", [])
            gt_rels = annotations.get("relationships", [])

            # Match entities
            # Form normalized tuples: (type, normalized_value)
            pred_entities_set = {
                (e["entity_type"], e["normalized_value"].lower().strip()): e
                for e in extracted_entities
            }
            gt_entities_set = {
                (e["entity_type"], e["value"].lower().strip()): e
                for e in gt_entities
            }

            # Calculate Entity TP, FP, FN
            for gt_key, gt_obj in gt_entities_set.items():
                gt_type, gt_val = gt_key
                matched = False
                for pred_key, pred_obj in pred_entities_set.items():
                    pred_type, pred_val = pred_key
                    # Check match: exact or substring match
                    if gt_type == pred_type and (gt_val == pred_val or gt_val in pred_val or pred_val in gt_val):
                        matched = True
                        break

                if matched:
                    total_entity_tp += 1
                    per_class_tp[gt_type] = per_class_tp.get(gt_type, 0) + 1
                    # Confusion matrix: correct
                    if gt_type not in confusion_matrix:
                        confusion_matrix[gt_type] = {}
                    confusion_matrix[gt_type][gt_type] = confusion_matrix[gt_type].get(gt_type, 0) + 1
                else:
                    total_entity_fn += 1
                    per_class_fn[gt_type] = per_class_fn.get(gt_type, 0) + 1

            for pred_key, pred_obj in pred_entities_set.items():
                pred_type, pred_val = pred_key
                matched = False
                for gt_key, gt_obj in gt_entities_set.items():
                    gt_type, gt_val = gt_key
                    if (gt_val == pred_val or gt_val in pred_val or pred_val in gt_val):
                        matched = True
                        if gt_type != pred_type:
                            # Confusion between classes
                            if gt_type not in confusion_matrix:
                                confusion_matrix[gt_type] = {}
                            confusion_matrix[gt_type][pred_type] = confusion_matrix[gt_type].get(pred_type, 0) + 1
                        break
                if not matched:
                    total_entity_fp += 1
                    per_class_fp[pred_type] = per_class_fp.get(pred_type, 0) + 1

            # Match relationships: (source, target, relationship_type)
            pred_rel_set = {
                (r["source_label"].lower().strip(), r["target_label"].lower().strip(), r["relationship_type"]): r
                for r in extracted_rels
            }
            gt_rel_set = {
                (r["source"].lower().strip(), r["target"].lower().strip(), r["relationship_type"]): r
                for r in gt_rels
            }

            for gt_rkey in gt_rel_set:
                gt_s, gt_t, gt_type = gt_rkey
                matched = False
                for pred_rkey in pred_rel_set:
                    p_s, p_t, p_type = pred_rkey
                    if gt_type == p_type and (gt_s in p_s or p_s in gt_s) and (gt_t in p_t or p_t in gt_t):
                        matched = True
                        break
                if matched:
                    total_rel_tp += 1
                else:
                    total_rel_fn += 1

            for pred_rkey in pred_rel_set:
                p_s, p_t, p_type = pred_rkey
                matched = False
                for gt_rkey in gt_rel_set:
                    gt_s, gt_t, gt_type = gt_rkey
                    if (gt_s in p_s or p_s in gt_s) and (gt_t in p_t or p_t in gt_t):
                        matched = True
                        break
                if not matched:
                    total_rel_fp += 1

        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        # Compute precision, recall, F1
        def calc_prf(tp, fp, fn):
            p = round(tp / (tp + fp), 4) if (tp + fp) > 0 else 0.0
            r = round(tp / (tp + fn), 4) if (tp + fn) > 0 else 0.0
            f1 = round(2 * p * r / (p + r), 4) if (p + r) > 0 else 0.0
            return {"precision": p, "recall": r, "f1": f1, "support": tp + fn}

        entity_overall = calc_prf(total_entity_tp, total_entity_fp, total_entity_fn)
        rel_overall = calc_prf(total_rel_tp, total_rel_fp, total_rel_fn)

        # Per-class metrics
        all_classes = set(list(per_class_tp.keys()) + list(per_class_fp.keys()) + list(per_class_fn.keys()))
        per_class_metrics = {}
        for c in sorted(all_classes):
            tp = per_class_tp.get(c, 0)
            fp = per_class_fp.get(c, 0)
            fn = per_class_fn.get(c, 0)
            per_class_metrics[c] = calc_prf(tp, fp, fn)

        return {
            "has_ground_truth": True,
            "model_name": self.entity_extractor.model_name,
            "model_version": "1.0-hybrid",
            "checkpoint_path": settings.MODEL_CHECKPOINT,
            "model_status": self.entity_extractor.model_status,
            "evaluation_dataset_size": evaluated_reports_count,
            "entity_metrics": entity_overall,
            "relationship_metrics": rel_overall,
            "per_class_metrics": per_class_metrics,
            "confusion_matrix": confusion_matrix,
            "inference_time_ms": elapsed_ms,
            "evaluated_at": datetime.utcnow().isoformat() + "Z"
        }
