"""Record endpoints — serves completed extraction results (in-memory store
with DB fallback for numeric ExtractedRecord ids)."""
from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.jobs import STORE

router = APIRouter()


def _find_record(rec_id: str) -> dict:
    """Locate a completed record by recId across finished jobs."""
    for job in STORE.values():
        rec = job.get("record")
        if rec and rec.get("recId") == rec_id:
            return rec
    return {}


async def _find_record_db(record_id: int) -> dict:
    """Load an ExtractedRecord (+ fields, evidences, validation) from the DB."""
    from app.services.pipeline_db import get_session_factory
    from app.models.extraction import ExtractedRecord, RecordField

    factory = get_session_factory()
    async with factory() as session:
        stmt = (
            select(ExtractedRecord)
            .options(
                selectinload(ExtractedRecord.fields).selectinload(RecordField.evidences),
                selectinload(ExtractedRecord.validation_runs),
            )
            .where(ExtractedRecord.id == record_id)
        )
        result = await session.execute(stmt)
        record = result.scalar_one_or_none()
        if not record:
            return {}

        fields_out = []
        for f in record.fields:
            bbox = None
            if f.evidences and f.evidences[0].bounding_box:
                bbox = f.evidences[0].bounding_box
            fields_out.append({
                "key": f.field_name,
                "value": f.final_value or f.human_value or f.ai_value,
                "aiValue": f.ai_value,
                "humanValue": f.human_value,
                "finalValue": f.final_value,
                "confidence": f.ai_confidence,
                "bbox": bbox,
            })

        validation = None
        if record.validation_runs:
            vr = record.validation_runs[0]
            validation = {
                "trustScore": vr.overall_trust_score,
                "runAt": str(vr.run_at),
            }

        return {
            "recId": str(record.id),
            "documentId": record.document_id,
            "status": record.status.value if record.status else None,
            "extractionConfidence": record.extraction_confidence,
            "fields": fields_out,
            "validation": validation,
        }


@router.get("/records/{rec_id}")
async def get_record(rec_id: str):
    rec = _find_record(rec_id)
    if not rec and rec_id.isdigit():
        rec = await _find_record_db(int(rec_id))
    if not rec:
        raise HTTPException(404, f"record {rec_id} not found")
    return rec


@router.get("/records")
def list_records():
    """List all completed records (newest first)."""
    records = [
        job["record"]
        for job in STORE.values()
        if job.get("status") == "done" and job.get("record")
    ]
    records.sort(key=lambda r: r.get("recId", ""), reverse=True)
    return {"records": records, "count": len(records)}
