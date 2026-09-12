"""GET /jobs/{jobId} — live pipeline progress + extracted record."""
from fastapi import APIRouter, HTTPException

from app.core.jobs import get_job as fetch_job

router = APIRouter()


@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    job = fetch_job(job_id)
    if not job:
        raise HTTPException(404, f"job {job_id} not found")
    return job
