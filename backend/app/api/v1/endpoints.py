"""FastAPI API endpoints for LANDLENS backend services."""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid, asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.services.pipeline_db import start_job, get_session_factory, fetch_stages_for_job
from app.services.validation.engine import ValidationEngine
from app.services.verification.handler import VerificationHandler
from app.services.audit.logger import log_event
from app.models.extraction import Document, ExtractedRecord, RecordField
from app.models.pipeline import ProcessingJob, StageStatus

router = APIRouter()


class VerifyRequest(BaseModel):
    action: str
    field_changes: Optional[dict] = None
    reason: Optional[str] = ""
    officer_id: Optional[int] = None


@router.post("/jobs/upload")
async def upload_job(
    file: UploadFile = File(...),
    lang: str = Form("Marathi"),
):
    """Upload a document for processing. Creates Document + ProcessingJob with all stages."""
    job_id_str = uuid.uuid4().hex[:8]

    tmp = f"/tmp/{job_id_str}_{file.filename}"
    with open(tmp, "wb") as f:
        f.write(await file.read())

    factory = get_session_factory()
    async with factory() as session:
        document = Document(document_type=None)
        session.add(document)
        await session.flush()
        doc_id = document.id

        job = await start_job(doc_id, factory)
        job_id_str = f"job_{job.id}"

    asyncio.create_task(_run_pipeline(job.id, factory))

    return {"jobId": job_id_str, "status": "queued"}


async def _run_pipeline(job_id: int, session_factory):
    """Drive the job through all pipeline stages asynchronously."""
    try:
        from app.services.pipeline.runner import PipelineOrchestrator
        orchestrator = PipelineOrchestrator(session_factory)
        await orchestrator.process_document(job_id)
    except Exception as e:
        from app.services.pipeline_db import mark_job_failed
        await mark_job_failed(job_id, session_factory)


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get job status with progress and current stage."""
    if job_id.startswith("job_"):
        numeric_id = int(job_id.replace("job_", ""))
    else:
        numeric_id = int(job_id)

    factory = get_session_factory()
    async with factory() as session:
        stmt = select(ProcessingJob).where(ProcessingJob.id == numeric_id)
        result = await session.execute(stmt)
        job = result.scalar_one_or_none()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        stages = await fetch_stages_for_job(numeric_id, factory)

        completed = sum(1 for s in stages if s.status == StageStatus.COMPLETED)
        total = len(stages)
        progress = int((completed / total) * 100) if total else 0

        current_stage = None
        for s in stages:
            if s.status == StageStatus.RUNNING:
                current_stage = s.stage_name.value
                break

        status_map = {
            StageStatus.PENDING: "queued",
            StageStatus.RUNNING: "processing",
            StageStatus.COMPLETED: "done",
            StageStatus.FAILED: "failed",
        }
        status = status_map.get(job.overall_status, "unknown")

        response = {
            "status": status,
            "progress": progress,
            "current_stage": current_stage,
        }

        if job.overall_status == StageStatus.COMPLETED:
            stmt_rec = select(ExtractedRecord).where(ExtractedRecord.document_id == job.document_id)
            rec_result = await session.execute(stmt_rec)
            record = rec_result.scalar_one_or_none()
            if record:
                response["result"] = {"recordId": record.id}

        return response


@router.get("/records/{record_id}")
async def get_record(record_id: int):
    """Return ExtractedRecord with all fields, bboxes, and validation results."""
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
            raise HTTPException(status_code=404, detail="Record not found")

        fields_out = []
        for f in record.fields:
            bbox = None
            if f.evidences:
                ev = f.evidences[0]
                if ev.bounding_box:
                    bbox = ev.bounding_box
            fields_out.append({
                "fieldName": f.field_name,
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
                "runAt": vr.run_at,
            }

        return {
            "recordId": record.id,
            "documentId": record.document_id,
            "status": record.status.value if record.status else None,
            "extractionConfidence": record.extraction_confidence,
            "fields": fields_out,
            "validation": validation,
        }


@router.post("/records/{record_id}/validate")
async def validate_record(record_id: int):
    """Trigger the ValidationEngine on an extracted record."""
    factory = get_session_factory()
    engine = ValidationEngine()
    async with factory() as session:
        try:
            result = await engine.run_validation(record_id, session)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))

    return {
        "routing": result["routing"],
        "confidence_score": result["confidence_score"],
        "checks": result["checks"],
    }


@router.post("/verify/{task_id}")
async def review_task(task_id: int, body: VerifyRequest):
    """Process a verification action via VerificationHandler."""
    valid_actions = {"accept", "correct", "reject", "reprocess", "escalate"}
    if body.action not in valid_actions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action. Must be one of: {valid_actions}",
        )

    handler = VerificationHandler()
    try:
        result = await handler.review_task(
            task_id=task_id,
            action=body.action,
            field_changes=body.field_changes or {},
            reason=body.reason or "",
            officer_id=body.officer_id or 0,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return result


@router.get("/tasks/{officer_id}")
async def get_verification_tasks(officer_id: int):
    """Return the verification task queue for an officer, ordered by priority."""
    handler = VerificationHandler()
    tasks = await handler.get_task_queue(officer_id)
    return {"tasks": tasks, "count": len(tasks)}
