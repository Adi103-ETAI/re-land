from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks
import uuid, os, asyncio
from app.schemas.record import JobStatus
from app.core.jobs import create_job
from app.services.pipeline import run_pipeline

router = APIRouter()

@router.post("/records/upload", response_model=JobStatus)
async def upload_record(background: BackgroundTasks, file: UploadFile = File(...), lang: str = Form("Marathi")):
    job_id = f"job_{uuid.uuid4().hex[:8]}"
    safe_name = "".join(c for c in (file.filename or "scan.jpg") if c.isalnum() or c in "._-") or "scan.jpg"
    tmp = f"/tmp/{job_id}_{safe_name}"
    with open(tmp, "wb") as f:
        f.write(await file.read())
    create_job(job_id)
    # Background Gemini extraction — laptop-light, API does heavy lifting
    background.add_task(run_pipeline, job_id, tmp, lang)
    return JobStatus(jobId=job_id, status="queued", progress=0)
