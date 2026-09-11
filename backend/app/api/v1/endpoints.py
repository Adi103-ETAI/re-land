"""FastAPI API endpoints for LANDLENS backend."""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import uuid, asyncio
from datetime import datetime, timezone

# Import services
try:
    from app.services.pipeline_db import start_job
    from app.services.validation.engine import ValidationEngine
    from app.services.verification.handler import VerificationHandler
    from app.services.audit.logger import log_event
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False

router = APIRouter()

# In-memory job store (fallback until DB wired)
_jobs = {}


@router.post("/records/upload")
async def upload_record(
    file: UploadFile = File(...),
    lang: str = Form("Marathi"),
):
    """Upload a document for processing."""
    job_id = f"job_{uuid.uuid4().hex[:8]}"
    
    # Save file
    tmp = f"/tmp/{job_id}_{file.filename}"
    with open(tmp, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Store job
    _jobs[job_id] = {
        "jobId": job_id,
        "status": "queued",
        "progress": 0,
        "stage": None,
        "result": None,
        "error": None
    }
    
    # Start async pipeline
    asyncio.create_task(_run_pipeline(job_id, tmp, lang))
    
    return {"jobId": job_id, "status": "queued", "progress": 0}


async def _run_pipeline(job_id: str, file_path: str, lang: str):
    """Run the document processing pipeline."""
    _jobs[job_id]["status"] = "processing"
    _jobs[job_id]["stage"] = "preprocessing"
    _jobs[job_id]["progress"] = 10
    
    try:
        # Stage 1: Preprocess
        await asyncio.sleep(0.1)
        _jobs[job_id]["progress"] = 20
        _jobs[job_id]["stage"] = "ocr"
        
        # Stage 2: OCR + Extraction (placeholder)
        await asyncio.sleep(0.2)
        _jobs[job_id]["progress"] = 60
        _jobs[job_id]["stage"] = "validation"
        
        # Stage 3: Validate
        await asyncio.sleep(0.1)
        _jobs[job_id]["progress"] = 90
        
        # Complete
        _jobs[job_id]["status"] = "done"
        _jobs[job_id]["progress"] = 100
        _jobs[job_id]["stage"] = None
        _jobs[job_id]["result"] = {
            "recordId": f"LR-MH-2026-{uuid.uuid4().hex[:6].upper()}",
            "status": "pending_validation"
        }
        
    except Exception as e:
        _jobs[job_id]["status"] = "failed"
        _jobs[job_id]["error"] = str(e)


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get processing job status."""
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/records/{record_id}/validate")
async def validate_record(record_id: str):
    """Trigger validation on an extracted record."""
    # TODO: Implement with real DB lookup and ValidationEngine
    return {
        "routing": "REVIEW",
        "confidence_score": 85.0,
        "checks": [
            {"check": "business_rules", "status": "pass", "severity": "informational"},
            {"check": "duplicate_detection", "status": "inconclusive", "severity": "minor"}
        ]
    }


@router.post("/verify/{task_id}")
async def review_task(
    task_id: str,
    action: str,
    field_changes: Optional[dict] = None,
    reason: Optional[str] = None,
    officer_id: Optional[str] = None
):
    """Handle human verification action."""
    valid_actions = {"accept", "correct", "reject", "reprocess", "escalate"}
    if action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action. Must be one of: {valid_actions}")
    
    # TODO: Implement with real DB and VerificationHandler
    return {
        "taskId": task_id,
        "action": action,
        "status": "completed",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/tasks/{officer_id}")
async def get_verification_tasks(officer_id: str):
    """Get verification task queue for an officer."""
    # TODO: Query database for pending tasks
    return {"tasks": [], "count": 0}
