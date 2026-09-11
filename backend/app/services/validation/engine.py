"""Modular validation engine with risk-based routing (SAFE/REVIEW/HIGH_RISK)."""
import asyncio
import re
import abc
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.validation import ValidationRun, ValidationCheck, ValidationConflict, CheckStatus, CheckSeverity
from app.models.record import LandRecord, OwnershipHistory, Parcel
from app.models.extraction import ExtractedRecord, RecordField


class BaseValidationCheck(abc.ABC):
    """Abstract base class for all validation checks."""

    @abc.abstractmethod
    async def run(self, record: dict, db_session: AsyncSession) -> dict:
        """Run the check against a record.

        Returns:
            {check, status (pass/fail/warning/inconclusive), severity,
             expected_value, actual_value, source, reason, confidence}
        """
        ...


class BusinessRulesCheck(BaseValidationCheck):
    """Check business rules: area > 0, khata pattern KH-\\d{4,6}, survey number format valid."""

    async def run(self, record: dict, db_session: AsyncSession) -> dict:
        check_name = "business_rules"
        source = "business_rules"
        issues = []
        severity = CheckSeverity.INFORMATIONAL
        status = CheckStatus.PASS
        expected_value = "Valid"
        actual_value = "Valid"
        confidence = 1.0

        area = record.get("area")
        khata = record.get("khata", "")
        survey = record.get("survey", "")

        if area is not None:
            try:
                area_val = float(area) if not isinstance(area, (int, float)) else float(area)
                if area_val <= 0:
                    issues.append("Area must be greater than 0")
                    severity = CheckSeverity.MAJOR
                    status = CheckStatus.FAIL
            except (ValueError, TypeError):
                issues.append(f"Area is not a valid number: {area}")
                severity = CheckSeverity.MAJOR
                status = CheckStatus.FAIL
        else:
            issues.append("Area is missing")
            severity = CheckSeverity.MAJOR
            status = CheckStatus.FAIL

        if khata and not re.match(r"^KH-\d{4,6}$", str(khata)):
            issues.append(f"Khata number '{khata}' does not match pattern KH-\\d{{4,6}}")
            severity = CheckSeverity.MINOR if severity == CheckSeverity.INFORMATIONAL else severity
            status = CheckStatus.WARNING

        if survey and not re.match(r"^\d{1,3}/\d{1,3}[A-Z]?\b", str(survey)):
            issues.append(f"Survey number '{survey}' has invalid format")
            severity = CheckSeverity.MINOR if severity == CheckSeverity.INFORMATIONAL else severity
            status = CheckStatus.WARNING

        if issues:
            reason = "; ".join(issues)
            actual_value = "; ".join(issues)
        else:
            reason = "All business rules passed"

        return {
            "check": check_name,
            "status": status,
            "severity": severity,
            "expected_value": expected_value,
            "actual_value": actual_value,
            "source": source,
            "reason": reason,
            "confidence": confidence,
        }


class DuplicateDetectionCheck(BaseValidationCheck):
    """Query existing LandRecords for same survey_no + village, return fuzzy match score."""

    async def run(self, record: dict, db_session: AsyncSession) -> dict:
        check_name = "duplicate_detection"
        source = "duplicate_detection"
        survey = record.get("survey", "")
        village = record.get("village", "")
        owner = record.get("owner", "")

        expected_value = "No duplicate found"
        confidence = 1.0

        try:
            stmt = select(LandRecord).join(ExtractedRecord).filter(
                ExtractedRecord.fields.any(
                    RecordField.field_name == "survey",
                    RecordField.normalized_value == str(survey),
                )
            )
            result = await db_session.execute(stmt)
            existing = result.scalars().all()
        except Exception:
            existing = []

        if existing:
            best_score = 0.0
            for lr in existing:
                for f in lr.extracted_record.fields:
                    if f.field_name == "owner" and owner:
                        owner_sim = self._fuzzy_similarity(str(f.normalized_value).lower(), owner.lower())
                        best_score = max(best_score, owner_sim)

            if best_score >= 0.8:
                status = CheckStatus.FAIL
                severity = CheckSeverity.CRITICAL
                reason = f"Possible duplicate detected with fuzzy match score {best_score:.2f}"
                actual_value = str(round(best_score, 2))
                confidence = round(1.0 - best_score, 2)
            elif best_score >= 0.5:
                status = CheckStatus.WARNING
                severity = CheckSeverity.MINOR
                reason = f"Possible duplicate with fuzzy match score {best_score:.2f}"
                actual_value = str(round(best_score, 2))
                confidence = round(1.0 - best_score, 2)
            else:
                status = CheckStatus.PASS
                severity = CheckSeverity.INFORMATIONAL
                reason = "No significant duplicate found"
                actual_value = "No duplicate"
        else:
            status = CheckStatus.PASS
            severity = CheckSeverity.INFORMATIONAL
            reason = "No duplicate found in database"
            actual_value = "No duplicate"

        return {
            "check": check_name,
            "status": status,
            "severity": severity,
            "expected_value": expected_value,
            "actual_value": actual_value,
            "source": source,
            "reason": reason,
            "confidence": confidence,
        }

    @staticmethod
    def _fuzzy_similarity(s1: str, s2: str) -> float:
        """Simple token-based fuzzy similarity."""
        if not s1 or not s2:
            return 0.0
        tokens1 = set(s1.split())
        tokens2 = set(s2.split())
        if not tokens1 or not tokens2:
            return 0.0
        intersection = tokens1 & tokens2
        return len(intersection) / max(len(tokens1), len(tokens2))


class CrossFieldConsistencyCheck(BaseValidationCheck):
    """Verify area stated matches any other area field on same record."""

    async def run(self, record: dict, db_session: AsyncSession) -> dict:
        check_name = "cross_field_consistency"
        source = "cross_field_consistency"
        area = record.get("area")
        area_db = record.get("areaDb")

        expected_value = "Areas match"
        confidence = 1.0

        if area is None or area_db is None:
            status = CheckStatus.INCONCLUSIVE
            severity = CheckSeverity.INFORMATIONAL
            reason = "Missing area fields for comparison"
            actual_value = "N/A"
        else:
            try:
                a1 = float(area) if not isinstance(area, (int, float)) else float(area)
                a2 = float(area_db) if not isinstance(area_db, (int, float)) else float(area_db)
                if abs(a1 - a2) > 0.001:
                    status = CheckStatus.FAIL
                    severity = CheckSeverity.MAJOR
                    reason = f"Area mismatch: stated area {a1} vs database area {a2}"
                    actual_value = f"stated={a1}, db={a2}"
                    confidence = round(1.0 - abs(a1 - a2) / max(a1, a2, 0.001), 2)
                else:
                    status = CheckStatus.PASS
                    severity = CheckSeverity.INFORMATIONAL
                    reason = "Area values are consistent"
                    actual_value = str(a1)
            except (ValueError, TypeError):
                status = CheckStatus.WARNING
                severity = CheckSeverity.MINOR
                reason = "Could not compare area values"
                actual_value = f"stated={area}, db={area_db}"
                confidence = 0.5

        return {
            "check": check_name,
            "status": status,
            "severity": severity,
            "expected_value": expected_value,
            "actual_value": actual_value,
            "source": source,
            "reason": reason,
            "confidence": confidence,
        }


class HistoricalConsistencyCheck(BaseValidationCheck):
    """Stub for Historical Consistency — needs OwnershipHistory table."""

    async def run(self, record: dict, db_session: AsyncSession) -> dict:
        check_name = "historical_consistency"
        source = "historical_consistency"
        return {
            "check": check_name,
            "status": CheckStatus.INCONCLUSIVE,
            "severity": CheckSeverity.INFORMATIONAL,
            "expected_value": "Pending OwnershipHistory table",
            "actual_value": "Not available",
            "source": source,
            "reason": "Historical consistency check requires OwnershipHistory table integration (stub)",
            "confidence": 0.0,
        }


class GISCadastralCheck(BaseValidationCheck):
    """Stub — checks if parcel geometry exists and is reasonable."""

    async def run(self, record: dict, db_session: AsyncSession) -> dict:
        check_name = "gis_cadastral"
        source = "gis_cadastral"
        survey = record.get("survey", "")

        try:
            stmt = select(Parcel).filter(Parcel.survey_number == str(survey))
            result = await db_session.execute(stmt)
            parcel = result.scalar_one_or_none()
            if parcel and parcel.geometry:
                status = CheckStatus.PASS
                severity = CheckSeverity.INFORMATIONAL
                reason = "Parcel geometry found and verified"
                actual_value = "Geometry present"
                confidence = 0.9
            elif parcel:
                status = CheckStatus.WARNING
                severity = CheckSeverity.MINOR
                reason = "Parcel exists but geometry is missing"
                actual_value = "No geometry"
                confidence = 0.5
            else:
                status = CheckStatus.WARNING
                severity = CheckSeverity.MINOR
                reason = "Parcel geometry not found in GIS references"
                actual_value = "Not found"
                confidence = 0.3
        except Exception:
            status = CheckStatus.INCONCLUSIVE
            severity = CheckSeverity.INFORMATIONAL
            reason = "GIS/cadastral check unavailable (stub)"
            actual_value = "Not available"
            confidence = 0.0

        return {
            "check": check_name,
            "status": status,
            "severity": severity,
            "expected_value": "Parcel geometry exists",
            "actual_value": actual_value,
            "source": source,
            "reason": reason,
            "confidence": confidence,
        }


class ValidationEngine:
    """Modular validation engine that runs all checks in parallel and computes routing."""

    CHECKS = [
        BusinessRulesCheck,
        DuplicateDetectionCheck,
        CrossFieldConsistencyCheck,
        HistoricalConsistencyCheck,
        GISCadastralCheck,
    ]

    SAFE_THRESHOLD = 90.0
    REVIEW_THRESHOLD = 70.0

    async def run_validation(self, extracted_record_id: int, db_session: AsyncSession) -> dict:
        """Run all validation checks and determine routing decision."""

        # Fetch the extracted record to build the record dict
        stmt = select(ExtractedRecord).options(selectinload(ExtractedRecord.fields)).where(ExtractedRecord.id == extracted_record_id)
        result = await db_session.execute(stmt)
        extracted_record = result.scalar_one_or_none()

        if not extracted_record:
            raise ValueError(f"ExtractedRecord with id {extracted_record_id} not found")

        # Build record dict from ExtractedRecord fields
        record = {
            "survey": "",
            "khata": "",
            "owner": "",
            "area": None,
            "areaDb": None,
            "village": "",
            "tehsil": "",
            "district": "",
            "classification": "",
        }
        for f in extracted_record.fields:
            if f.field_name == "survey":
                record["survey"] = f.normalized_value or f.ai_value or ""
            elif f.field_name == "khata":
                record["khata"] = f.normalized_value or f.ai_value or ""
            elif f.field_name == "owner":
                record["owner"] = f.normalized_value or f.ai_value or ""
            elif f.field_name == "area":
                record["area"] = float(f.normalized_value) if f.normalized_value else None
                record["areaDb"] = float(f.normalized_value) if f.normalized_value else None
            elif f.field_name == "village":
                record["village"] = f.normalized_value or f.ai_value or ""
            elif f.field_name == "tehsil":
                record["tehsil"] = f.normalized_value or f.ai_value or ""
            elif f.field_name == "district":
                record["district"] = f.normalized_value or f.ai_value or ""

        # Create ValidationRun
        now = datetime.now(timezone.utc).isoformat()
        validation_run = ValidationRun(
            extracted_record_id=extracted_record_id,
            run_at=now,
            model_or_ruleset_version="1.0.0",
            overall_trust_score=None,
        )
        db_session.add(validation_run)
        await db_session.flush()

        # Run all checks in parallel
        check_instances = [cls() for cls in self.CHECKS]
        tasks = [check.run(record, db_session) for check in check_instances]
        results = await asyncio.gather(*tasks)

        # Persist ValidationCheck records
        for r in results:
            check = ValidationCheck(
                validation_run_id=validation_run.id,
                check_name=r["check"],
                status=r["status"],
                severity=r["severity"],
                expected_value=str(r["expected_value"]) if r["expected_value"] is not None else None,
                actual_value=str(r["actual_value"]) if r["actual_value"] is not None else None,
                source=r["source"],
                reason=r["reason"],
                confidence=r["confidence"],
            )
            db_session.add(check)
        await db_session.flush()

        # Calculate trust score
        trust_score = self._calculate_trust_score(results, extracted_record.extraction_confidence or 0.5)

        # Determine conflicts
        conflicts = self._identify_conflicts(results)

        # Determine routing
        routing = self._determine_routing(trust_score, conflicts, results)

        # Update ValidationRun with overall trust score
        validation_run.overall_trust_score = trust_score
        await db_session.flush()
        await db_session.commit()

        return {
            "routing": routing,
            "confidence_score": trust_score,
            "checks": results,
            "conflicts": conflicts,
        }

    def _calculate_trust_score(self, results: list[dict], extraction_confidence: float = 0.5) -> float:
        """Calculate overall trust score (0-100)."""
        if not results:
            return round(extraction_confidence * 50, 1)

        weights = {
            "business_rules": 25,
            "duplicate_detection": 25,
            "cross_field_consistency": 20,
            "historical_consistency": 15,
            "gis_cadastral": 15,
        }

        score = 0.0
        for r in results:
            weight = weights.get(r["check"], 10)
            confidence = r["confidence"] or 0.0
            status = r["status"]

            if status == CheckStatus.PASS:
                contribution = weight * confidence
            elif status == CheckStatus.WARNING:
                contribution = weight * confidence * 0.5
            elif status == CheckStatus.FAIL:
                contribution = weight * confidence * 0.1
            else:  # INCONCLUSIVE
                contribution = weight * 0.2

            score += contribution

        # Blend with extraction confidence
        score = score * 0.6 + extraction_confidence * 100 * 0.4
        return max(0.0, min(100.0, round(score, 1)))

    def _identify_conflicts(self, results: list[dict]) -> list[dict]:
        """Identify checks that represent conflicts requiring attention."""
        conflicts = []
        for r in results:
            if r["status"] in (CheckStatus.FAIL, CheckStatus.WARNING):
                conflicts.append({
                    "check": r["check"],
                    "severity": r["severity"].value if hasattr(r["severity"], "value") else str(r["severity"]),
                    "reason": r["reason"],
                    "confidence": r["confidence"],
                })
        return conflicts

    def _determine_routing(self, trust_score: float, conflicts: list[dict], results: list[dict]) -> str:
        """Determine routing tier based on risk-based decision model."""
        has_critical = any(
            r["status"] == CheckStatus.FAIL and r["severity"] == CheckSeverity.CRITICAL
            for r in results
        )
        has_major_fail = any(
            r["status"] == CheckStatus.FAIL and r["severity"] in (CheckSeverity.MAJOR, CheckSeverity.CRITICAL)
            for r in results
        )

        if has_critical or has_major_fail:
            return "HIGH_RISK"
        elif trust_score < self.REVIEW_THRESHOLD:
            return "HIGH_RISK"
        elif trust_score < self.SAFE_THRESHOLD or len(conflicts) > 0:
            return "REVIEW"
        else:
            return "SAFE"
