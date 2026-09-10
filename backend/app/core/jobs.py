from typing import Dict, Any
import time

# In-memory for laptop dev — replace with Redis/DB in prod
STORE: Dict[str, Dict[str, Any]] = {}

def create_job(job_id: str):
    STORE[job_id] = {"jobId": job_id, "status": "queued", "progress": 0, "record": None, "error": None, "created_at": time.time()}

def set_progress(job_id: str, status: str, progress: int):
    if job_id in STORE:
        STORE[job_id]["status"] = status
        STORE[job_id]["progress"] = progress

def set_done(job_id: str, record: Dict[str, Any]):
    if job_id in STORE:
        STORE[job_id]["status"] = "done"
        STORE[job_id]["progress"] = 100
        STORE[job_id]["record"] = record

def set_error(job_id: str, error: str):
    if job_id in STORE:
        STORE[job_id]["status"] = "failed"
        STORE[job_id]["error"] = error

def get_job(job_id: str):
    return STORE.get(job_id)
