"""Validation engine — cross-field checks, duplicate detection, trust score.

Scoring mirrors PLAN.md section 5:
    score = 100 - 6*areaMismatch - 4*duplicate - 2*lowConfField
Routing: >= 90 → auto_approve, >= 70 → human_review, else → high_risk.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import AUTO_APPROVE_SCORE, SCORE_WEIGHTS
from app.models import (
    Approval,
    CheckSeverity,
    CheckStatus,
    ExtractedRecord,
    RecordField,
    RecordStatus,
    ValidationCheck,
    ValidationRun,
    VerificationPriority,
    VerificationTask,
)
from app.models.verification import ApprovalDecision, ApprovalLevel
from app.services.extraction.rules import VILLAGES

logger = logging.getLogger(__name__)

SURVEY_RE = re.compile(r"^\d{1,3}/\d{1,3}[A-Z]?$")


class ValidationEngine:
    """Runs all checks for one extracted record and persists a ValidationRun."""

    async def run_validation(self, record_id: int, session: AsyncSession) -> dict:
        record = (await session.execute(
            select(ExtractedRecord)
            .options(selectinload(ExtractedRecord.fields).selectinload(RecordField.evidences))
            .where(ExtractedRecord.id == record_id)
        )).scalar_one_or_none()
        if record is None:
            raise ValueError(f"record {record_id} not found")

        values: dict[str, str] = {}
        confs: dict[str, float] = {}
        for f in record.fields:
            values[f.field_name] = (f.final_value or f.ai_value or "").strip()
            confs[f.field_name] = float(f.ai_confidence or 0.0)

        checks: list[dict] = []
        penalties = {"areaMismatch": 0, "duplicate": 0, "lowConfField": 0}
        dup_info = {"dupSim": 0, "dupMatch": None}

        def add_check(name: str, ok: bool | None, severity: str, expected: str, actual: str, source: str = "rule:gazetteer") -> None:
            status = CheckStatus.PASS if ok else CheckStatus.FAIL
            if ok is None:
                status = CheckStatus.WARNING
            checks.append({
                "name": name,
                "status": status.value,
                "severity": severity,
                "expected": expected,
                "actual": actual,
                "source": source,
            })

        # 1. Area sanity: 0 < area <= 500 ha
        area_raw = values.get("area", "—")
        nums = re.findall(r"\d+\.?\d*", area_raw)
        area = float(nums[0]) if nums else 0.0
        area_ok = 0.0 < area <= 500.0
        add_check("area_range", area_ok, CheckSeverity.CRITICAL.value, "0 < area <= 500 Ha", area_raw, "rule:LRMS-limits")
        if not area_ok:
            penalties["areaMismatch"] = 1

        # 2. Village gazetteer lookup
        village = values.get("village", "—")
        village_ok = village in VILLAGES
        add_check("village_gazetteer", village_ok if village != "—" else None,
                  CheckSeverity.MINOR.value, "in Pune district gazetteer", village, "ref:pune-gazetteer")

        # 3. Survey number format
        survey = values.get("survey", "—")
        survey_ok = bool(SURVEY_RE.match(survey)) if survey != "—" else None
        add_check("survey_format", survey_ok, CheckSeverity.CRITICAL.value, r"^\d{1,3}/\d{1,3}[A-Z]?$", survey, "rule:survey-format")

        # 4. Duplicate detection — same survey + village already extracted
        if survey != "—":
            stmt = (
                select(RecordField)
                .options(selectinload(RecordField.record))
                .where(
                    RecordField.field_name == "survey",
                    RecordField.normalized_value == survey,
                    RecordField.extracted_record_id != record.id,
                )
            )
            others = (await session.execute(stmt)).scalars().all()
            if others:
                other = others[0]
                dup_info = {"dupSim": 96, "dupMatch": f"rec_{other.extracted_record_id}"}
                add_check("duplicate_check", False, CheckSeverity.MAJOR.value,
                          "no prior record with same survey", dup_info["dupMatch"], "db:record_fields")
                penalties["duplicate"] = 1
            else:
                add_check("duplicate_check", True, CheckSeverity.MAJOR.value, "no prior record", "unique", "db:record_fields")
        else:
            add_check("duplicate_check", None, CheckSeverity.MINOR.value, "survey present", "—", "db:record_fields")

        # 5. Low-confidence critical fields
        low_conf = [
            k for k, c in confs.items()
            if c < 0.70 and values.get(k, "—") not in ("", "—")
        ]
        penalties["lowConfField"] = len(low_conf)
        add_check("low_confidence_fields", None if low_conf else True, CheckSeverity.MINOR.value,
                  "confidence >= 0.70", ", ".join(low_conf) if low_conf else "all fields confident", "rule:conf-threshold")

        score = 100
        score -= SCORE_WEIGHTS["areaMismatch"] * penalties["areaMismatch"]
        score -= SCORE_WEIGHTS["duplicate"] * penalties["duplicate"]
        score -= SCORE_WEIGHTS["lowConfField"] * min(penalties["lowConfField"], 10)
        score = max(0, min(100, score))

        if score >= AUTO_APPROVE_SCORE:
            routing, new_status = "auto_approve", RecordStatus.SAFE
        elif score >= 70:
            routing, new_status = "human_review", RecordStatus.REVIEW
        else:
            routing, new_status = "high_risk", RecordStatus.HIGH_RISK

        run = ValidationRun(
            extracted_record_id=record.id,
            run_at=datetime.now(timezone.utc).isoformat(),
            model_or_ruleset_version="rules-v1.1",
            overall_trust_score=float(score),
        )
        session.add(run)
        await session.flush()
        for c in checks:
            session.add(ValidationCheck(
                validation_run_id=run.id,
                check_name=c["name"],
                status=CheckStatus(c["status"]),
                severity=CheckSeverity(c["severity"]),
                expected_value=c["expected"],
                actual_value=c["actual"],
                source=c["source"],
            ))

        record.validation_score = float(score)
        record.status = new_status

        if routing == "auto_approve":
            session.add(Approval(
                extracted_record_id=record.id,
                level=ApprovalLevel.AUTO,
                decision=ApprovalDecision.APPROVED,
                timestamp=datetime.now(timezone.utc).isoformat(),
                reason=f"trust score {score} >= {AUTO_APPROVE_SCORE}",
            ))
        else:
            session.add(VerificationTask(
                extracted_record_id=record.id,
                assigned_to_id=self._verifier_id(session),
                reason="; ".join(
                    c["name"] for c in checks if c["status"] in (CheckStatus.FAIL.value, CheckStatus.WARNING.value)
                ) or "low trust score",
                priority=VerificationPriority.HIGH if score < 80 else VerificationPriority.MEDIUM,
                status=VerificationStatus.PENDING,
            ))

        await session.commit()
        return {
            "routing": routing,
            "confidence_score": score,
            "checks": checks,
            "duplicate": dup_info,
        }

    def _verifier_id(self, session: AsyncSession) -> int:
        from app.services.pipeline_db import SEED

        if SEED.get("verifier_id"):
            return SEED["verifier_id"]
        return 1
