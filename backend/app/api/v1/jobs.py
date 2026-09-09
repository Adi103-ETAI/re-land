from fastapi import APIRouter
from app.schemas.record import JobStatus
router = APIRouter()

@router.get("/jobs/{job_id}", response_model=JobStatus)
def get_job(job_id: str):
    # TODO: fetch from Redis/DB
    return JobStatus(jobId=job_id, status="queued", progress=0)
