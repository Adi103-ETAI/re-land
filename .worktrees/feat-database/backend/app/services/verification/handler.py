"""Human verification handler for land records."""

from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.audit import ActionType, EntityType
from app.models.extraction import ExtractedRecord, RecordField, RecordStatus
from app.models.record import LandRecord
from app.models.verification import (
    Approval,
    ApprovalDecision,
    TaskStatus,
    VerificationAction,
    VerificationTask,
)
from app.services.audit.logger import log_event
from app.services.pipeline_db import get_session_factory


class VerificationHandler:
    """Orchestrates human review of extracted land records."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession] | None = None):
        self._session_factory = session_factory

    # ── Assign ──────────────────────────────────────────────────────────

    async def assign_task(self, task_id: int, officer_id: int) -> VerificationTask:
        """Assign a pending verification task to an officer."""
        factory = self._session_factory or get_session_factory()
        async with factory() as session:
            stmt = select(VerificationTask).where(VerificationTask.id == task_id)
            result = await session.execute(stmt)
            task = result.scalar_one_or_none()
            if task is None:
                raise ValueError(f"Task {task_id} not found")
            if task.status != TaskStatus.PENDING:
                raise ValueError(f"Task {task_id} is not pending (status={task.status})")

            task.officer_id = officer_id
            task.status = TaskStatus.IN_PROGRESS
            task.assigned_at = datetime.now(timezone.utc).isoformat()

            await session.commit()
            await session.refresh(task)

            await log_event(
                record_id=task.record_id,
                title="Task assigned",
                description=f"Verification task {task_id} assigned to officer {officer_id}",
                meta={"task_id": task_id, "officer_id": officer_id},
                user_id=officer_id,
                action_type=ActionType.TASK_ASSIGNED,
                entity_type=EntityType.VERIFICATION_TASK,
                entity_id=task_id,
                session_factory=self._session_factory,
            )
            return task

    # ── Review ──────────────────────────────────────────────────────────

    async def review_task(
        self,
        task_id: int,
        action: VerificationAction,
        field_changes: dict | None = None,
        reason: str | None = None,
        officer_id: int | None = None,
    ) -> dict:
        """Process a human review decision on a verification task.

        Returns a summary dict with the outcome.
        """
        factory = self._session_factory or get_session_factory()
        async with factory() as session:
            # Load task
            stmt = select(VerificationTask).where(VerificationTask.id == task_id)
            result = await session.execute(stmt)
            task = result.scalar_one_or_none()
            if task is None:
                raise ValueError(f"Task {task_id} not found")

            now = datetime.now(timezone.utc)
            record_id = task.record_id
            summary: dict = {"task_id": task_id, "action": action.value}

            # Resolve officer
            oid = officer_id or task.officer_id

            if action == VerificationAction.ACCEPT:
                # Create approval, copy to LandRecord, mark complete
                approval = Approval(
                    record_id=record_id,
                    decision=ApprovalDecision.APPROVED,
                    officer_id=oid,
                    reason=reason,
                    field_changes=field_changes,
                )
                session.add(approval)
                await session.flush()

                # Copy extracted fields to LandRecord snapshot
                stmt_er = select(ExtractedRecord).where(ExtractedRecord.id == record_id)
                er = (await session.execute(stmt_er)).scalar_one()
                land_rec = LandRecord(
                    extracted_record_id=record_id,
                    approved_at=now.isoformat(),
                    current_snapshot=field_changes or {},
                )
                session.add(land_rec)

                # Mark extracted record as auto_approved
                er.status = RecordStatus.AUTO_APPROVED

                # Mark task completed
                task.status = TaskStatus.COMPLETED
                task.completed_at = now.isoformat()

                summary["approval_id"] = approval.id
                summary["decision"] = "approved"

            elif action == VerificationAction.CORRECT:
                # Update RecordField with human_value
                if not field_changes:
                    raise ValueError("field_changes required for correct action")
                for field_name, human_value in field_changes.items():
                    stmt_f = (
                        select(RecordField)
                        .where(
                            RecordField.extracted_record_id == record_id,
                            RecordField.field_name == field_name,
                        )
                    )
                    rf = (await session.execute(stmt_f)).scalar_one_or_none()
                    if rf:
                        rf.human_value = human_value
                        rf.final_value = human_value

                # Create approval record
                approval = Approval(
                    record_id=record_id,
                    decision=ApprovalDecision.CORRECTED,
                    officer_id=oid,
                    reason=reason,
                    field_changes=field_changes,
                )
                session.add(approval)

                # Mark extracted record
                stmt_er = select(ExtractedRecord).where(ExtractedRecord.id == record_id)
                er = (await session.execute(stmt_er)).scalar_one()
                er.status = RecordStatus.CORRECTED

                task.status = TaskStatus.COMPLETED
                task.completed_at = now.isoformat()

                summary["approval_id"] = approval.id
                summary["decision"] = "corrected"
                summary["fields_updated"] = list(field_changes.keys())

            elif action == VerificationAction.REJECT:
                approval = Approval(
                    record_id=record_id,
                    decision=ApprovalDecision.REJECTED,
                    officer_id=oid,
                    reason=reason,
                    field_changes=field_changes,
                )
                session.add(approval)

                stmt_er = select(ExtractedRecord).where(ExtractedRecord.id == record_id)
                er = (await session.execute(stmt_er)).scalar_one()
                er.status = RecordStatus.REJECTED

                task.status = TaskStatus.REJECTED
                task.completed_at = now.isoformat()

                summary["approval_id"] = approval.id
                summary["decision"] = "rejected"

            elif action == VerificationAction.REPROCESS:
                task.status = TaskStatus.PENDING_REPROCESS
                summary["decision"] = "reprocess"

            elif action == VerificationAction.ESCALATE:
                task.status = TaskStatus.ESCALATED
                task.priority = "high"
                summary["decision"] = "escalated"

            await session.commit()
            await session.refresh(task)

            # Audit trail
            await log_event(
                record_id=record_id,
                title=f"Verification {action.value}",
                description=reason or f"Officer {oid} performed {action.value} on task {task_id}",
                meta={"task_id": task_id, **summary},
                user_id=oid,
                action_type=ActionType.VERIFICATION_DECISION,
                entity_type=EntityType.VERIFICATION_TASK,
                entity_id=task_id,
                session_factory=self._session_factory,
            )

            return summary

    # ── Queue ───────────────────────────────────────────────────────────

    async def get_task_queue(
        self, officer_id: int | None = None
    ) -> list[VerificationTask]:
        """Return pending tasks, optionally filtered by officer."""
        factory = self._session_factory or get_session_factory()
        async with factory() as session:
            stmt = select(VerificationTask).where(
                VerificationTask.status.in_([
                    TaskStatus.PENDING,
                    TaskStatus.IN_PROGRESS,
                ])
            )
            if officer_id is not None:
                stmt = stmt.where(
                    VerificationTask.officer_id == officer_id
                )
            stmt = stmt.order_by(
                VerificationTask.priority.desc(),
                VerificationTask.created_at.asc(),
            )
            result = await session.execute(stmt)
            return list(result.scalars().all())
