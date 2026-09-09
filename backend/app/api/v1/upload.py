from fastapi import APIRouter, UploadFile, File, Form
import uuid, os
from app.schemas.record import JobStatus

router = APIRouter()

@router.post("/records/upload", response_model=JobStatus)
async def upload_record(file: UploadFile = File(...), lang: str = Form("Marathi")):
    job_id = f"job_{uuid.uuid4().hex[:8]}"
    # Save original to tmp for pipeline (S3 in prod)
    tmp = f"/tmp/{job_id}_{file.filename}"
    with open(tmp, "wb") as f:
        f.write(await file.read())
    # TODO: enqueue pipeline → preprocess → ocr → extraction → validation
    # For now return queued; pipeline.py will update job status
    return JobStatus(jobId=job_id, status="queued", progress=0)
