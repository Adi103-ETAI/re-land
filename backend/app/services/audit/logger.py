"""Audit logger for immutable audit events."""
from __future__ import annotations

from app.models.audit import AuditEvent, ActionType, EntityType
from app.services.pipeline_db import get_session_factory


async def log_event(record_id: int, title: str, description: str, meta: dict, user_id: int, action_type: str) -> None:
    """Create an immutable AuditEvent entry.

    Args:
        record_id: The ID of the record being audited.
        title: Short title for the audit event.
        description: Detailed description of the action.
        meta: Additional metadata as a dict.
        user_id: The ID of the user performing the action.
        action_type: The action type string, mapped to ActionType enum.
    """
    factory = get_session_factory()
    async with factory() as session:
        action = ActionType(action_type)
        entity = _infer_entity_type(action_type)

        event = AuditEvent(
            record_id=record_id,
            title=title,
            description=description,
            action_type=action,
            entity_type=entity,
            entity_id=record_id,
            user_id=user_id,
            meta=meta,
        )
        session.add(event)
        await session.commit()
        await session.refresh(event)


def _infer_entity_type(action_type: str) -> EntityType:
    """Infer the EntityType from an action type string."""
    mapping = {
        "task_assigned": EntityType.VERIFICATION_TASK,
        "record_approved": EntityType.APPROVAL,
        "field_corrected": EntityType.RECORD_FIELD,
        "record_rejected": EntityType.APPROVAL,
        "reprocess_requested": EntityType.EXTRACTED_RECORD,
        "task_escalated": EntityType.VERIFICATION_TASK,
        "verification_decision": EntityType.VERIFICATION_TASK,
    }
    return mapping.get(action_type, EntityType.EXTRACTED_RECORD)
