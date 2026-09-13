"""Record upload endpoint — saves the file and launches the processing pipeline."""
import asyncio
import os
import uuid

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer

from app.schemas.record import JobStatus
from app.core.jobs import create_job
from app.core.config import MAX_UPLOAD_MB
from app.core.db import get_db
from app.services.auth.service import AuthService
from app.services.pipeline import run_pipeline

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".pdf", ".webp", ".bmp"}
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/landlens-uploads")


@router.post("/records/upload", response_model=JobStatus)
async def upload_record(
    file: UploadFile = File(...),
    lang: str = Form("Marathi"),
    token: str = Depends(oauth2_scheme),
    db=Depends(get_db),
):
    # Auth (soft — required when a token is presented, 401 if invalid)
    if token:
        user = await AuthService.validate_token(db, token)
        if not user:
            raise HTTPException(401, "Session expired or invalid")

    if not file.filename:
        raise HTTPException(400, "No filename provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            400,
            f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    job_id = f"job_{uuid.uuid4().hex[:8]}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    # Sanitize stored filename — never trust client input
    safe_name = f"{job_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    # Stream to disk with size cap
    max_bytes = MAX_UPLOAD_MB * 1024 * 1024
    size = 0
    with open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > max_bytes:
                f.close()
                os.remove(file_path)
                raise HTTPException(413, f"File exceeds {MAX_UPLOAD_MB}MB limit")
            f.write(chunk)

    if size == 0:
        os.remove(file_path)
        raise HTTPException(400, "Empty file")

    # Register job + launch the real pipeline in the background
    create_job(job_id)
    asyncio.get_event_loop().create_task(run_pipeline(job_id, file_path, lang))

    return JobStatus(jobId=job_id, status="queued", progress=0)
