"""Async database layer + job orchestration helpers.

Out of the box this runs on SQLite (aiosqlite) with zero external services.
Set DATABASE_URL to a Postgres URL for production.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import DATABASE_URL
from app.models.base import Base
# Importing the models package registers every table on Base.metadata
from app.models import (  # noqa: F401
    Approval,
    Batch,
    Document,
    DocumentPage,
    ExtractedRecord,
    OrganizationUnit,
    OrgLevel,
    ProcessingJob,
    ProcessingStage,
    RecordStatus,
    StageName,
    StageStatus,
    User,
    UserRole,
    VerificationPriority,
    VerificationTask,
)
from app.models.verification import ApprovalDecision, ApprovalLevel, VerificationStatus  # noqa: F401

logger = logging.getLogger(__name__)

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)

_initialized = False

# Cached seed ids (operator user / default batch) used by the upload endpoint
SEED: dict = {}


def get_session_factory():
    return SessionFactory


def _hash_password(password: str) -> str:
    salt = "landlens-static-seed"  # deterministic seed passwords (dev only)
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex()


async def init_db() -> None:
    """Create tables (idempotent) and seed the demo officer users."""
    global _initialized
    if _initialized:
        return
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with SessionFactory() as session:
        await _seed(session)
        await session.commit()
    _initialized = True
    logger.info("Database ready at %s", DATABASE_URL)


async def _seed(session) -> None:
    unit = (await session.execute(
        select(OrganizationUnit).where(OrganizationUnit.name == "Pune District")
    )).scalar_one_or_none()
    if unit is None:
        unit = OrganizationUnit(name="Pune District", level=OrgLevel.DISTRICT)
        session.add(unit)
        await session.flush()

    operator = (await session.execute(
        select(User).where(User.email == "operator@landlens.local")
    )).scalar_one_or_none()
    if operator is None:
        operator = User(
            username="operator",
            email="operator@landlens.local",
            hashed_password=_hash_password("operator123"),
            role=UserRole.DIGITIZATION_OFFICER,
            org_unit_id=unit.id,
        )
        session.add(operator)
        await session.flush()

    verifier = (await session.execute(
        select(User).where(User.email == "verifier@landlens.local")
    )).scalar_one_or_none()
    if verifier is None:
        verifier = User(
            username="verifier",
            email="verifier@landlens.local",
            hashed_password=_hash_password("verifier123"),
            role=UserRole.VERIFICATION_OFFICER,
            org_unit_id=unit.id,
        )
        session.add(verifier)
        await session.flush()

    batch = (await session.execute(
        select(Batch).where(Batch.original_filename == "ui-uploads")
    )).scalar_one_or_none()
    if batch is None:
        batch = Batch(original_filename="ui-uploads", created_by_id=operator.id)
        session.add(batch)
        await session.flush()

    SEED.update(operator_id=operator.id, verifier_id=verifier.id, batch_id=batch.id)


async def start_job(document_id: int, factory=None) -> ProcessingJob:
    """Create a ProcessingJob with one pending row per pipeline stage."""
    factory = factory or get_session_factory()
    async with factory() as session:
        job = ProcessingJob(document_id=document_id, overall_status=StageStatus.PENDING)
        session.add(job)
        await session.flush()
        for stage in StageName:
            session.add(ProcessingStage(job_id=job.id, stage_name=stage, status=StageStatus.PENDING))
        await session.commit()
        await session.refresh(job)
        return job


async def fetch_stages_for_job(job_id: int, factory=None) -> list[ProcessingStage]:
    factory = factory or get_session_factory()
    async with factory() as session:
        result = await session.execute(
            select(ProcessingStage)
            .where(ProcessingStage.job_id == job_id)
            .order_by(ProcessingStage.id)
        )
        return list(result.scalars().all())


async def mark_job_failed(job_id: int, factory=None) -> None:
    factory = factory or get_session_factory()
    async with factory() as session:
        job = await session.get(ProcessingJob, job_id)
        if job is not None:
            job.overall_status = StageStatus.FAILED
            await session.commit()


async def create_document_and_job(
    *,
    original_filename: str,
    storage_path: str,
    checksum: str,
) -> ProcessingJob:
    """Persist Document + first Page, then create the ProcessingJob for it."""
    if not SEED:
        await init_db()
    async with SessionFactory() as session:
        document = Document(
            batch_id=SEED["batch_id"],
            original_filename=original_filename,
            storage_reference=storage_path,
            checksum_hash=f"{checksum}:{datetime.now(timezone.utc).timestamp():.0f}",
            uploaded_by_id=SEED["operator_id"],
        )
        session.add(document)
        await session.flush()
        session.add(
            DocumentPage(
                document_id=document.id,
                page_number=1,
                image_storage_reference=storage_path,
            )
        )
        job = ProcessingJob(document_id=document.id, overall_status=StageStatus.PENDING)
        session.add(job)
        await session.flush()
        for stage in StageName:
            session.add(ProcessingStage(job_id=job.id, stage_name=stage, status=StageStatus.PENDING))
        await session.commit()
        await session.refresh(job)
        return job
