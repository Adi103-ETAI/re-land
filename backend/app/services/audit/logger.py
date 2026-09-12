"""Audit logger for immutable audit events (mirrors models/audit.py columns)."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ActionType, AuditEvent, EntityType


async def log_event(
    session: AsyncSession,
    *,
    actor_id: int | None,
    action: str | ActionType,
    entity_type: str | EntityType,
    entity_id: int,
    previous_value: str | None = None,
    new_value: str | None = None,
    reason: str | None = None,
    source: str | None = None,
    approval_level: str | None = None,
) -> AuditEvent:
    """Create an immutable AuditEvent row (caller owns the transaction)."""
    action = ActionType(action) if isinstance(action, str) else action
    entity = EntityType(entity_type) if isinstance(entity_type, str) else entity_type

    event = AuditEvent(
        actor_id=actor_id,
        action=action,
        entity_type=entity,
        entity_id=entity_id,
        previous_value=previous_value,
        new_value=new_value,
        reason=reason,
        source=source,
        approval_level=approval_level,
    )
    session.add(event)
    return event
