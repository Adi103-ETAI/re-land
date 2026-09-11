"""Verification handler for human review tasks."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from app.models.extraction import ExtractedRecord, RecordField, RecordStatus
from app.models.record import LandRecord
from app.models.verification import (
    Approval, ApprovalDecision, VerificationTask, TaskStatus,
)
from app.services.audit.logger import log_event
from app.services.pipeline_db import get_session_factory


class VerificationHandler:
    """Handles verification task assignment and officer review actions."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession] | None = None):
        self._session_factory = session_factory or get_session_factory()

    async def assign_task(self, task_id: int, officer_id: int) -> None:
        """Assign a verification task to an officer."""
        factory = self._session_factory
        async with factory() as session:
            task = VerificationTask(
                record_id=task_id,
                officer_id=officer_id,
                status=TaskStatus.IN_PROGRESS,
                priority="normal",
                assigned_at=datetime.now(timezone.utc).isoformat(),
            )
            session.add(task)
            await session.flush()

            await log_event(
                record_id=task_id,
                title="Verification Task Assigned",
                description=f"Task for record {task_id} assigned to officer {officer_id}",
                meta={"officer_id": officer_id, "task_id": task_id},
                user_id=officer_id,
                action_type="task_assigned",
            )
            await session.commit()

    async def review_task(self, task_id: int, action: str, field_changes: dict, reason: str, officer_id: int) -> dict:
        """Process a verification action on a task."""
        factory = self._session_factory
        async with factory() as session:
            result = await self._handle_action(
                session, task_id, action, field_changes, reason, officer_id
            )
            await session.commit()
            return result

    async def _handle_action(
        self,
        session: AsyncSession,
        task_id: int,
        action: str,
        field_changes: dict,
        reason: str,
        officer_id: int,
    ) -> dict:
        """Execute the given action and return a result dict."""
        stmt = select(ExtractedRecord).where(ExtractedRecord.id == task_id)
        result = await session.execute(stmt)
        record = result.scalar_one_or_none()
        if not record:
            raise ValueError(f"ExtractedRecord with id {task_id} not found")

        action_lower = action.lower()

        if action_lower == "accept":
            return await self._accept(session, record, officer_id, reason)
        elif action_lower == "correct":
            return await self._correct(session, record, field_changes, officer_id, reason)
        elif action_lower == "reject":
            return await self._reject(session, record, officer_id, reason)
        elif action_lower == "reprocess":
            return await self._reprocess(session, record)
        elif action_lower == "escalate":
            return await self._escalate(session, record, officer_id, reason)
        else:
            raise ValueError(f"Unknown action: {action}")

    async def _accept(self, session: AsyncSession, record: ExtractedRecord, officer_id: int, reason: str) -> dict:
        """Accept the record: create Approval and copy ExtractedRecord → LandRecord snapshot."""
        approval = Approval(
            record_id=record.id,
            decision=ApprovalDecision.APPROVED,
            officer_id=officer_id,
            reason=reason,
            field_changes=None,
        )
        session.add(approval)
        await session.flush()

        land_record = LandRecord(
            extracted_record_id=record.id,
            approved_at=datetime.now(timezone.utc).isoformat(),
            current_snapshot={
                "record_id": record.id,
                "status": record.status.value if record.status else None,
                "fields": [
                    {"name": f.field_name, "ai_value": f.ai_value, "human_value": f.human_value, "final_value": f.final_value}
                    for f in record.fields
                ],
            },
        )
        session.add(land_record)

        record.status = RecordStatus.COMPLETED

        await log_event(
            record_id=record.id,
            title="Record Accepted",
            description=f"Record {record.id} accepted by officer {officer_id}",
            meta={"officer_id": officer_id, "reason": reason},
            user_id=officer_id,
            action_type="record_approved",
        )

        return {"status": "accepted", "record_id": record.id, "land_record_id": land_record.id}

    async def _correct(self, session: AsyncSession, record: ExtractedRecord, field_changes: dict, officer_id: int, reason: str) -> dict:
        """Correct the record: update RecordField human_value and final_value."""
        for field_name, new_value in field_changes.items():
            stmt = select(RecordField).where(
                RecordField.extracted_record_id == record.id,
                RecordField.field_name == field_name,
            )
            result = await session.execute(stmt)
            field = result.scalar_one_or_none()
            if field:
                field.human_value = new_value
                field.final_value = new_value

        approval = Approval(
            record_id=record.id,
            decision=ApprovalDecision.CORRECTED,
            officer_id=officer_id,
            reason=reason,
            field_changes=field_changes,
        )
        session.add(approval)

        record.status = RecordStatus.CORRECTED

        await log_event(
            record_id=record.id,
            title="Record Corrected",
            description=f"Record {record.id} corrected by officer {officer_id}",
            meta={"officer_id": officer_id, "field_changes": field_changes, "reason": reason},
            user_id=officer_id,
            action_type="field_corrected",
        )

        return {"status": "corrected", "record_id": record.id, "fields_updated": list(field_changes.keys())}

    async def _reject(self, session: AsyncSession, record: ExtractedRecord, officer_id: int, reason: str) -> dict:
        """Reject the record: create Approval with decision='rejected'."""
        approval = Approval(
            record_id=record.id,
            decision=ApprovalDecision.REJECTED,
            officer_id=officer_id,
            reason=reason,
            field_changes=None,
        )
        session.add(approval)

        record.status = RecordStatus.REJECTED

        await log_event(
            record_id=record.id,
            title="Record Rejected",
            description=f"Record {record.id} rejected by officer {officer_id}",
            meta={"officer_id": officer_id, "reason": reason},
            user_id=officer_id,
            action_type="record_rejected",
        )

        return {"status": "rejected", "record_id": record.id}

    async def _reprocess(self, session: AsyncSession, record: ExtractedRecord) -> dict:
        """Reprocess the record: reset ExtractedRecord.status to pending (EXTRACTED)."""
        previous_status = record.status
        record.status = RecordStatus.EXTRACTED

        await log_event(
            record_id=record.id,
            title="Reprocess Requested",
            description=f"Record {record.id} sent back for reprocessing from {previous_status.value if previous_status else 'unknown'}",
            meta={"previous_status": previous_status.value if previous_status else None},
            user_id=record.id,
            action_type="reprocess_requested",
        )

        return {"status": "reprocess_requested", "record_id": record.id}

    async def _escalate(self, session: AsyncSession, record: ExtractedRecord, officer_id: int, reason: str) -> dict:
        """Escalate the task: set status to ESCALATED, priority to HIGH."""
        stmt = select(VerificationTask).where(
            VerificationTask.record_id == record.id,
            VerificationTask.officer_id == officer_id,
        )
        result = await session.execute(stmt)
        task = result.scalar_one_or_none()
        if task:
            task.status = TaskStatus.ESCALATED
            task.priority = "HIGH"
            task.completed_at = datetime.now(timezone.utc).isoformat()

        record.status = RecordStatus.ESCALATED

        await log_event(
            record_id=record.id,
            title="Task Escalated",
            description=f"Record {record.id} escalated by officer {officer_id}",
            meta={"officer_id": officer_id, "reason": reason, "priority": "HIGH"},
            user_id=officer_id,
            action_type="task_escalated",
        )

        return {"status": "escalated", "record_id": record.id, "priority": "HIGH"}

    async def get_task_queue(self, officer_id: int) -> list:
        """Get the verification task queue for an officer."""
        factory = self._session_factory
        async with factory() as session:
            stmt = (
                select(VerificationTask)
                .where(VerificationTask.officer_id == officer_id)
                .options(selectinload(VerificationTask.record))
                .order_by(VerificationTask.assigned_at)
            )
            result = await session.execute(stmt)
            tasks = result.scalars().all()
            return [task.to_dict() for task in tasks]
