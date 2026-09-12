"""Verification workflow — officer decisions on records flagged for review."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    AuditEvent,
    ActionType,
    EntityType,
    ExtractedRecord,
    RecordField,
    RecordStatus,
    VerificationAction,
    VerificationStatus,
    VerificationTask,
)
from app.models.verification import Approval, ApprovalDecision, ApprovalLevel, VerificationActionType

logger = logging.getLogger(__name__)

ACTION_MAP = {
    "accept": VerificationActionType.ACCEPT,
    "correct": VerificationActionType.CORRECT,
    "reject": VerificationActionType.REJECT,
    "reprocess": VerificationActionType.REPROCESS,
    "escalate": VerificationActionType.ESCALATE,
}

DECISION_TO_ACTION = {
    "approved": "accept",
    "accepted": "accept",
    "rejected": "reject",
    "corrected": "correct",
}


class VerificationHandler:
    """Applies officer decisions to verification tasks / records."""

    async def review_task(
        self,
        task_id: int,
        action: str,
        field_changes: dict | None = None,
        reason: str = "",
        officer_id: int = 0,
        session: AsyncSession | None = None,
    ) -> dict:
        if action not in ACTION_MAP:
            raise ValueError(f"invalid action: {action}")
        if session is None:
            from app.services.pipeline_db import get_session_factory

            async with get_session_factory() as s:
                return await self.review_task(task_id, action, field_changes, reason, officer_id, session)

        task = await session.get(VerificationTask, task_id)
        if task is None:
            raise ValueError(f"task {task_id} not found")

        record = (await session.execute(
            select(ExtractedRecord)
            .options(selectinload(ExtractedRecord.fields))
            .where(ExtractedRecord.id == task.extracted_record_id)
        )).scalar_one_or_none()
        if record is None:
            raise ValueError(f"record {task.extracted_record_id} not found")

        applied: dict[str, dict] = {}
        if action == "correct" and field_changes:
            for f in record.fields:
                if f.field_name in field_changes:
                    new_val = str(field_changes[f.field_name])
                    applied[f.field_name] = {"old": f.final_value, "new": new_val}
                    f.human_value = new_val
                    f.final_value = new_val
                    f.ai_confidence = 1.0

        status_map = {
            "accept": RecordStatus.SAFE,
            "correct": RecordStatus.CORRECTED,
            "reject": RecordStatus.REJECTED,
            "escalate": RecordStatus.ESCALATED,
            "reprocess": RecordStatus.EXTRACTED,
        }
        record.status = status_map[action]

        if action in ("accept", "correct"):
            session.add(Approval(
                extracted_record_id=record.id,
                level=ApprovalLevel.FIRST,
                decision=ApprovalDecision.APPROVED,
                timestamp=datetime.now(timezone.utc).isoformat(),
                reason=reason or f"officer {action}",
            ))

        task.status = VerificationStatus.COMPLETED if action != "escalate" else VerificationStatus.ESCALATED

        session.add(VerificationAction(
            verification_task_id=task.id,
            actor_id=officer_id or task.assigned_to_id,
            action_type=ACTION_MAP[action],
            field_changes=applied or None,
            reason=reason or None,
        ))
        session.add(AuditEvent(
            actor_id=officer_id or task.assigned_to_id,
            action=self._audit_action(action),
            entity_type=EntityType.RECORD,
            entity_id=record.id,
            previous_value=record.status.value,
            new_value=record.status.value,
            reason=reason or None,
            source="verification-ui",
        ))

        await session.commit()
        return {
            "taskId": task.id,
            "recordId": f"rec_{record.id}",
            "action": action,
            "status": record.status.value,
            "appliedChanges": applied,
        }

    async def get_task_queue(self, officer_id: int, session: AsyncSession | None = None) -> list[dict]:
        if session is None:
            from app.services.pipeline_db import get_session_factory

            async with get_session_factory() as s:
                return await self.get_task_queue(officer_id, s)

        stmt = (
            select(VerificationTask)
            .options(selectinload(VerificationTask.record).selectinload(ExtractedRecord.fields))
            .where(VerificationTask.status.in_([VerificationStatus.PENDING, VerificationStatus.IN_PROGRESS]))
            .order_by(VerificationTask.id)
        )
        tasks = (await session.execute(stmt)).scalars().all()
        out: list[dict] = []
        for t in tasks:
            rec = t.record
            values = {f.field_name: (f.final_value or f.ai_value) for f in (rec.fields if rec else [])}
            out.append({
                "taskId": t.id,
                "recordId": f"rec_{rec.id}" if rec else None,
                "owner": values.get("owner", "—"),
                "survey": values.get("survey", "—"),
                "village": values.get("village", "—"),
                "trustScore": int(rec.validation_score or 0) if rec else 0,
                "reason": t.reason,
                "priority": t.priority.value if t.priority else "medium",
                "status": t.status.value if t.status else "pending",
            })
        return out

    @staticmethod
    def _audit_action(action: str) -> ActionType:
        return {
            "accept": ActionType.ACCEPT,
            "correct": ActionType.CORRECT,
            "reject": ActionType.REJECT,
            "reprocess": ActionType.RETRY,
            "escalate": ActionType.ESCALATE,
        }[action]
