"""POST /verify/{recId} — officer decision on an extracted record."""
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import ExtractedRecord, RecordField, RecordStatus, VerificationStatus, VerificationTask

router = APIRouter()


class VerifyIn(BaseModel):
    decision: str  # Approved | Rejected | Corrected
    officerValue: str | None = None
    officerId: int | None = None


@router.post("/verify/{rec_id}")
async def verify_record(rec_id: str, body: VerifyIn):
    m = re.fullmatch(r"rec_(\d+)", rec_id)
    if not m:
        raise HTTPException(404, f"unknown record id {rec_id}")
    record_id = int(m.group(1))

    action = body.decision.strip().lower()
    if action not in ("approved", "accepted", "rejected", "corrected"):
        raise HTTPException(400, "decision must be Approved | Rejected | Corrected")

    from app.services.pipeline_db import get_session_factory
    from app.services.verification.handler import VerificationHandler

    handler = VerificationHandler()
    async with get_session_factory()() as session:
        record = (await session.execute(
            select(ExtractedRecord).where(ExtractedRecord.id == record_id)
        )).scalar_one_or_none()
        if record is None:
            raise HTTPException(404, f"record {record_id} not found")

        task = (await session.execute(
            select(VerificationTask)
            .where(
                VerificationTask.extracted_record_id == record_id,
                VerificationTask.status == VerificationStatus.PENDING,
            )
            .order_by(VerificationTask.id.desc())
        )).scalars().first()

        field_changes = None
        if body.officerValue and action == "corrected":
            field_changes = {"owner": body.officerValue}

        if task is not None:
            result = await handler.review_task(
                task_id=task.id,
                action=action,
                field_changes=field_changes,
                reason=body.officerValue or "",
                officer_id=body.officerId or 0,
                session=session,
            )
        else:
            # No pending task — apply the decision directly to the record
            status_map = {
                "approved": RecordStatus.SAFE,
                "accepted": RecordStatus.SAFE,
                "rejected": RecordStatus.REJECTED,
                "corrected": RecordStatus.CORRECTED,
            }
            record.status = status_map[action]
            if field_changes:
                for f in (await session.execute(
                    select(RecordField).where(RecordField.extracted_record_id == record_id)
                )).scalars():
                    if f.field_name in field_changes:
                        f.human_value = field_changes[f.field_name]
                        f.final_value = field_changes[f.field_name]
            await session.commit()
            result = {"recordId": rec_id, "action": action, "status": record.status.value, "appliedChanges": field_changes or {}}

    return {"recId": rec_id, "decision": body.decision, "status": result.get("status")}
