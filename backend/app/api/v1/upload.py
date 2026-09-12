"""POST /records/upload — persist document, create job, launch the pipeline."""
import asyncio

from fastapi import APIRouter, File, Form, UploadFile

from app.core.jobs import create_job
from app.services.pipeline.runner import PipelineOrchestrator
from app.services.pipeline_db import create_document_and_job

router = APIRouter()

_background: set[asyncio.Task] = set()


@router.post("/records/upload")
async def upload_record(file: UploadFile = File(...), lang: str = Form("Marathi")):
    """Queue a document for the extraction pipeline.

    Returns the job id immediately; poll /jobs/{jobId} for progress.
    """
    payload = await file.read()
    if not payload:
        from fastapi import HTTPException

        raise HTTPException(status_code=400, detail="empty file")

    import hashlib
    import uuid
    from pathlib import Path

    from app.core.config import UPLOAD_DIR

    safe_name = Path(file.filename or "upload.jpg").name
    storage_path = str(UPLOAD_DIR / f"{uuid.uuid4().hex[:8]}_{safe_name}")
    with open(storage_path, "wb") as fh:
        fh.write(payload)

    job = await create_document_and_job(
        original_filename=safe_name,
        storage_path=storage_path,
        checksum=hashlib.sha256(payload).hexdigest(),
    )

    store_id = f"job_{job.id}"
    create_job(store_id)

    task = asyncio.create_task(PipelineOrchestrator().process_document(job.id, store_id, lang))
    _background.add(task)
    task.add_done_callback(_background.discard)

    return {"jobId": store_id, "job_id": store_id, "status": "queued", "progress": 0}
