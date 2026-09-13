"""Database bootstrap: table creation, seeding, and session dependency."""
from __future__ import annotations

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.pipeline_db import get_engine, get_session_factory
from app.core.jobs import STORE  # noqa: F401  (ensures module import order is stable)

logger = logging.getLogger(__name__)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async DB session."""
    factory = get_session_factory()
    async with factory() as session:
        yield session


async def init_db() -> None:
    """Create all tables and seed default users (idempotent)."""
    # Import models so every table is registered on Base.metadata
    import app.models  # noqa: F401
    from app.models.base import Base
    from app.services.auth.service import AuthService, seed_default_users
    from sqlalchemy import select
    from app.models.auth import User as AuthUser

    factory = get_session_factory()
    engine = get_engine()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ensured")

    # Seed default officer accounts (skip if any user exists)
    async with factory() as session:
        existing = await session.execute(select(AuthUser).limit(1))
        if existing.scalar_one_or_none() is None:
            await seed_default_users(session)
            logger.info("Seeded default officer accounts")
