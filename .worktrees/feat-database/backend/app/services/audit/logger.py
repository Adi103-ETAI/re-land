"""Immutable audit log service for LANDLENS."""

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.audit import AuditEvent, ActionType, EntityType
from app.services.pipeline_db import get_session_factory


async def log_event(
    record_id: int,
    title: str,
    description: str,
    meta: dict,
    user_id: int,
    action_type: ActionType,
    entity_type: EntityType = EntityType.EXTRACTED_RECORD,
    entity_id: int | None = None,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
) -> AuditEvent:
    """Append-only audit event creation.

    Once created, AuditEvent rows are never updated or deleted
    (enforced at the database permission layer).
    """
    factory = session_factory or get_session_factory()
    async with factory() as session:
        event = AuditEvent(
            record_id=record_id,
            title=title,
            description=description,
            action_type=action_type,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            metadata=meta,
        )
        session.add(event)
        await session.commit()
        await session.refresh(event)
        return event
