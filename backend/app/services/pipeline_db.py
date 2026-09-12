"""DB-persisted pipeline orchestrator using SQLAlchemy async."""
from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import DATABASE_URL
from app.models.base import Base
from app.models.pipeline import (
    ProcessingAttempt,
    ProcessingJob,
    ProcessingStage,
    StageName,
    StageStatus,
)

logger = logging.getLogger(__name__)

# ── Engine / session factory ────────────────────────────────────────────────


def _build_async_url(url: str) -> str:
    """Derive an async driver URL from the configured DATABASE_URL."""
    if url.startswith("sqlite://"):
        return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("sqlite+aiosqlite://"):
        return url
    return url


_engine: Optional[AsyncEngine] = None
_session_factory: Optional[async_sessionmaker[AsyncSession]] = None


def get_engine(url: str | None = None) -> AsyncEngine:
    global _engine
    if _engine is None:
        db_url = _build_async_url(url or DATABASE_URL)
        _engine = create_async_engine(db_url, echo=False, future=True)
    return _engine


def get_session_factory(url: str | None = None) -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=get_engine(url),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_factory


# ── Stage ordering (from doc §2 state machine) ─────────────────────────────

STAGE_ORDER: List[StageName] = [
    StageName.DOCUMENT_CLASSIFICATION,
    StageName.LANGUAGE_DETECTION,
    StageName.PAGE_ANALYSIS,
    StageName.IMAGE_PREPROCESSING,
    StageName.LAYOUT_REGION_DETECTION,
    StageName.OCR_HANDWRITING_RECOGNITION,
    StageName.RECORD_SEGMENTATION,
    StageName.FIELD_EXTRACTION,
    StageName.FIELD_CLASSIFICATION,
    StageName.NORMALIZATION,
    StageName.RECORD_RECONSTRUCTION,
    StageName.VALIDATION,
    StageName.DECISION,
]


# ── DB CRUD helpers ─────────────────────────────────────────────────────────


async def start_job(
    document_id: int,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
) -> ProcessingJob:
    """Create a new ProcessingJob and all pipeline stages in PENDING state."""
    factory = session_factory or get_session_factory()
    async with factory() as session:
        job = ProcessingJob(
            document_id=document_id,
            current_stage=None,
            overall_status=StageStatus.PENDING,
            started_at=datetime.now(timezone.utc),
        )
        session.add(job)
        await session.flush()

        for name in STAGE_ORDER:
            stage = ProcessingStage(
                job_id=job.id,
                stage_name=name,
                status=StageStatus.PENDING,
                progress_percentage=0.0,
            )
            session.add(stage)

        await session.commit()
        await session.refresh(job)
        logger.info("Created job %d for document %d", job.id, document_id)
        return job


async def advance_stage(
    job_id: int,
    stage_name: str,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
) -> ProcessingStage:
    """Transition a stage: PENDING -> RUNNING (start) or RUNNING -> COMPLETED."""
    factory = session_factory or get_session_factory()
    stage_enum = StageName(stage_name) if isinstance(stage_name, str) else stage_name

    async with factory() as session:
        stmt = select(ProcessingStage).where(
            ProcessingStage.job_id == job_id,
            ProcessingStage.stage_name == stage_enum,
        )
        result = await session.execute(stmt)
        stage = result.scalar_one_or_none()
        if stage is None:
            raise ValueError(f"Stage {stage_name} not found for job {job_id}")

        now = datetime.now(timezone.utc)

        if stage.status == StageStatus.PENDING:
            stage.status = StageStatus.RUNNING
            stage.started_at = now
        elif stage.status == StageStatus.RUNNING:
            stage.status = StageStatus.COMPLETED
            stage.completed_at = now
            stage.progress_percentage = 100.0
        elif stage.status == StageStatus.RETRYING:
            stage.status = StageStatus.RUNNING
            stage.started_at = now
        else:
            raise ValueError(f"Cannot advance stage in status {stage.status}")

        # Update job current_stage
        stmt_job = select(ProcessingJob).where(ProcessingJob.id == job_id)
        job_result = await session.execute(stmt_job)
        job = job_result.scalar_one()
        job.current_stage = stage_enum

        await session.commit()
        await session.refresh(stage)
        logger.info("Stage %s -> %s (job %d)", stage_name, stage.status.value, job_id)
        return stage


async def retry_stage(
    stage: ProcessingStage,
    max_retries: int = 3,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
) -> bool:
    """Attempt a retry. Returns True if stage should be retried, False if exhausted."""
    factory = session_factory or get_session_factory()
    async with factory() as session:
        # Re-fetch the stage within this session
        stmt = select(ProcessingStage).where(ProcessingStage.id == stage.id)
        result = await session.execute(stmt)
        stage = result.scalar_one()

        # Count existing attempts for this stage
        stmt_attempts = select(ProcessingAttempt).where(
            ProcessingAttempt.stage_id == stage.id
        )
        result_attempts = await session.execute(stmt_attempts)
        attempts = result_attempts.scalars().all()
        attempt_count = len(attempts)

        now = datetime.now(timezone.utc)

        if attempt_count < max_retries:
            stage.status = StageStatus.RETRYING
            attempt = ProcessingAttempt(
                stage_id=stage.id,
                attempt_number=attempt_count + 1,
                config_used={},
                started_at=now,
                outcome=StageStatus.RETRYING,
            )
            session.add(attempt)
            await session.commit()
            await session.refresh(stage)
            logger.info(
                "Stage %s retrying (attempt %d/%d)",
                stage.stage_name.value if hasattr(stage.stage_name, 'value') else stage.stage_name,
                attempt_count + 1,
                max_retries,
            )
            return True
        else:
            stage.status = StageStatus.FAILED
            stage.completed_at = now
            await session.commit()
            await session.refresh(stage)
            logger.warning("Stage %s exhausted retries", stage.stage_name.value if hasattr(stage.stage_name, 'value') else stage.stage_name)
            return False


async def mark_job_failed(
    job_id: int,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
) -> ProcessingJob:
    """Mark the overall job as FAILED."""
    factory = session_factory or get_session_factory()
    async with factory() as session:
        stmt = select(ProcessingJob).where(ProcessingJob.id == job_id)
        result = await session.execute(stmt)
        job = result.scalar_one_or_none()
        if job is None:
            raise ValueError(f"Job {job_id} not found")
        job.overall_status = StageStatus.FAILED
        job.completed_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(job)
        return job


async def mark_job_completed(
    job_id: int,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
) -> ProcessingJob:
    """Mark the overall job as COMPLETED."""
    factory = session_factory or get_session_factory()
    async with factory() as session:
        stmt = select(ProcessingJob).where(ProcessingJob.id == job_id)
        result = await session.execute(stmt)
        job = result.scalar_one_or_none()
        if job is None:
            raise ValueError(f"Job {job_id} not found")
        job.overall_status = StageStatus.COMPLETED
        job.completed_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(job)
        return job


async def log_attempt(
    stage_id: int,
    attempt_number: int,
    outcome: StageStatus,
    config_used: Dict[str, Any] | None = None,
    failure_reason: str | None = None,
    failure_category: str | None = None,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
) -> ProcessingAttempt:
    """Log an attempt record for a stage."""
    factory = session_factory or get_session_factory()
    now = datetime.now(timezone.utc)
    async with factory() as session:
        attempt = ProcessingAttempt(
            stage_id=stage_id,
            attempt_number=attempt_number,
            config_used=config_used or {},
            started_at=now,
            ended_at=now,
            outcome=outcome,
            failure_reason=failure_reason,
            failure_category=failure_category,
        )
        session.add(attempt)
        await session.commit()
        await session.refresh(attempt)
        return attempt


async def fetch_stages_for_job(
    job_id: int,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
) -> List[ProcessingStage]:
    """Fetch all stages for a job, ordered by stage ordering."""
    factory = session_factory or get_session_factory()
    async with factory() as session:
        stmt = select(ProcessingStage).where(
            ProcessingStage.job_id == job_id
        ).order_by(ProcessingStage.id)
        result = await session.execute(stmt)
        return list(result.scalars().all())


# ── Stage stub implementations ──────────────────────────────────────────────


async def classify_document(doc_id: int) -> Dict[str, Any]:
    """STUB: Document classification stage."""
    return {"doc_type": "land_record", "language": "Marathi", "handwriting": False}


async def detect_language(page_images: list) -> str:
    """STUB: Language detection stage."""
    return "Marathi"


async def preprocess_page(img: Any) -> Any:
    """STUB: Image preprocessing stage."""
    return img


async def detect_layout(img: Any) -> Dict[str, Any]:
    """STUB: Layout / region detection stage."""
    return {"regions": [{"type": "table", "bbox": [0, 0, 100, 100]}]}


async def run_ocr(page_id: int) -> Dict[str, Any]:
    """STUB: OCR / handwriting recognition stage."""
    return {"text": "", "confidence": 0.0, "words": []}


async def segment_records(ocr_results: Dict[str, Any]) -> List[Dict[str, Any]]:
    """STUB: Record segmentation stage."""
    return [{"record_index": 0, "pages": [0]}]


async def extract_fields(segmented: List[Dict[str, Any]]) -> Dict[str, Any]:
    """STUB: Field extraction stage."""
    return {"fields": {}, "confidence": 0.0}


async def classify_fields(raw_fields: Dict[str, Any]) -> Dict[str, Any]:
    """STUB: Field classification stage."""
    return raw_fields


async def normalize_fields(classified: Dict[str, Any]) -> Dict[str, Any]:
    """STUB: Normalization stage."""
    return classified


async def reconstruct_record(normalized: Dict[str, Any]) -> Dict[str, Any]:
    """STUB: Record reconstruction stage."""
    return {"record": {}, "fields": normalized}


async def validate_record(record_id: int) -> Dict[str, Any]:
    """STUB: Validation stage."""
    return {"valid": True, "checks": [], "score": 100}


async def make_decision(record: Dict[str, Any]) -> str:
    """STUB: Decision stage. Routes to SAFE / REVIEW / HIGH_RISK."""
    return "SAFE"


# ── Stage name → stub function mapping ──────────────────────────────────────

STAGE_STUBS: Dict[StageName, Any] = {
    StageName.DOCUMENT_CLASSIFICATION: classify_document,
    StageName.LANGUAGE_DETECTION: detect_language,
    StageName.PAGE_ANALYSIS: lambda _id: asyncio.sleep(0),  # no-op stub
    StageName.IMAGE_PREPROCESSING: preprocess_page,
    StageName.LAYOUT_REGION_DETECTION: detect_layout,
    StageName.OCR_HANDWRITING_RECOGNITION: run_ocr,
    StageName.RECORD_SEGMENTATION: segment_records,
    StageName.FIELD_EXTRACTION: extract_fields,
    StageName.FIELD_CLASSIFICATION: classify_fields,
    StageName.NORMALIZATION: normalize_fields,
    StageName.RECORD_RECONSTRUCTION: reconstruct_record,
    StageName.VALIDATION: validate_record,
    StageName.DECISION: make_decision,
}


# ── Pipeline Orchestrator ───────────────────────────────────────────────────


class PipelineOrchestrator:
    """Drives a document through all pipeline stages with DB persistence."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession] | None = None):
        self._session_factory = session_factory

    async def process_document(self, doc_id: int) -> ProcessingJob:
        """Create a job and drive through ALL stages sequentially.

        For each stage:
          1. advance_stage (PENDING -> RUNNING)
          2. run stage stub
          3. on success: advance_stage (RUNNING -> COMPLETED)
          4. on failure: retry_stage loop, then mark FAILED
        """
        job = await start_job(doc_id, self._session_factory)
        stages = await fetch_stages_for_job(job.id, self._session_factory)

        for stage in stages:
            success = await self._run_stage(job.id, stage)
            if not success:
                await mark_job_failed(job.id, self._session_factory)
                # Refresh to get updated status
                factory = self._session_factory or get_session_factory()
                async with factory() as session:
                    stmt = select(ProcessingJob).where(ProcessingJob.id == job.id)
                    result = await session.execute(stmt)
                    job = result.scalar_one()
                return job

        await mark_job_completed(job.id, self._session_factory)
        factory = self._session_factory or get_session_factory()
        async with factory() as session:
            stmt = select(ProcessingJob).where(ProcessingJob.id == job.id)
            result = await session.execute(stmt)
            job = result.scalar_one()
        return job

    async def _run_stage(self, job_id: int, stage: ProcessingStage, max_retries: int = 3) -> bool:
        """Run a single stage with retry logic. Returns True on success."""
        for attempt in range(max_retries + 1):
            try:
                # Start the stage
                stage_name_str = stage.stage_name if isinstance(stage.stage_name, str) else stage.stage_name.value
                await advance_stage(job_id, stage_name_str, self._session_factory)

                # Log the attempt
                stub_fn = STAGE_STUBS.get(stage.stage_name)
                if stub_fn:
                    # Determine args based on stage type
                    _NO_ARG = object()
                    args = self._get_stage_args(stage.stage_name, job_id)
                    if args is _NO_ARG:
                        await stub_fn()
                    else:
                        await stub_fn(args)

                # Mark stage completed
                await advance_stage(job_id, stage_name_str, self._session_factory)

                # Log successful attempt
                await log_attempt(
                    stage_id=stage.id,
                    attempt_number=attempt + 1,
                    outcome=StageStatus.COMPLETED,
                    config_used={"stub": True},
                    session_factory=self._session_factory,
                )
                return True

            except Exception as e:
                logger.error(
                    "Stage %s attempt %d failed: %s",
                    stage_name_str,
                    attempt + 1,
                    str(e),
                )
                # Log failed attempt
                await log_attempt(
                    stage_id=stage.id,
                    attempt_number=attempt + 1,
                    outcome=StageStatus.FAILED,
                    failure_reason=str(e),
                    failure_category="runtime_error",
                    session_factory=self._session_factory,
                )

                # Retry logic
                factory = self._session_factory or get_session_factory()
                async with factory() as session:
                    stmt = select(ProcessingStage).where(ProcessingStage.id == stage.id)
                    result = await session.execute(stmt)
                    stage = result.scalar_one()

                should_retry = await retry_stage(stage, max_retries, self._session_factory)
                if not should_retry:
                    return False

        return False

    def _get_stage_args(self, stage_name: StageName, job_id: int) -> Any:
        """Return the appropriate argument for a stage stub based on its input requirements.
        
        Returns a special _NO_ARG sentinel for stages that take no arguments.
        """
        _NO_ARG = object()
        
        # Stages that take no arguments
        if stage_name in (
            StageName.PAGE_ANALYSIS,
            StageName.IMAGE_PREPROCESSING,
            StageName.LAYOUT_REGION_DETECTION,
        ):
            return _NO_ARG
        
        # Stages that take a job_id-like int
        if stage_name == StageName.DOCUMENT_CLASSIFICATION:
            return job_id
        if stage_name == StageName.OCR_HANDWRITING_RECOGNITION:
            return job_id
        if stage_name == StageName.VALIDATION:
            return job_id
        
        # Stages that take a list
        if stage_name == StageName.LANGUAGE_DETECTION:
            return []
        if stage_name == StageName.FIELD_EXTRACTION:
            return []
        
        # Stages that take a dict
        if stage_name == StageName.RECORD_SEGMENTATION:
            return {}
        if stage_name in (StageName.FIELD_CLASSIFICATION, StageName.NORMALIZATION):
            return {}
        if stage_name == StageName.RECORD_RECONSTRUCTION:
            return {}
        if stage_name == StageName.DECISION:
            return {}
        
        return _NO_ARG
