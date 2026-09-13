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

from app.services.pipeline_db import get_session_factory
from app.services.validation.engine import ValidationEngine
from app.services.verification.handler import VerificationHandler
from app.services.audit.logger import log_event
from app.models.extraction import ExtractedRecord, RecordField
from app.core.jobs import create_job
from app.services.pipeline import run_pipeline

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
    """Upload a document for processing — saves it and launches the pipeline."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    job_id = f"job_{uuid.uuid4().hex[:8]}"
    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    file_path = f"/tmp/landlens-uploads/{job_id}{ext}"
    os.makedirs("/tmp/landlens-uploads", exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(await file.read())

    create_job(job_id)
    asyncio.create_task(run_pipeline(job_id, file_path, lang))

    return {"jobId": job_id, "status": "queued"}


async def _run_pipeline_db(job_id: int, session_factory):
    """Drive the job through all pipeline stages asynchronously."""
    try:
        from app.services.pipeline.runner import PipelineOrchestrator
        orchestrator = PipelineOrchestrator(session_factory)
        await orchestrator.process_document(job_id)
    except Exception:
        from app.services.pipeline_db import mark_job_failed
        await mark_job_failed(job_id, session_factory)


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
