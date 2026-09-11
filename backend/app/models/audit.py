"""Immutable audit trail models."""
from sqlalchemy import Column, String, Integer, ForeignKey, Enum as SAEnum, JSON, Text
from app.models.base import Base, BaseRecord
import enum


class ActionType(str, enum.Enum):
    RECORD_CREATED = "record_created"
    RECORD_UPDATED = "record_updated"
    RECORD_APPROVED = "record_approved"
    RECORD_REJECTED = "record_rejected"
    FIELD_CORRECTED = "field_corrected"
    TASK_ASSIGNED = "task_assigned"
    TASK_COMPLETED = "task_completed"
    TASK_ESCALATED = "task_escalATED"
    REPROCESS_REQUESTED = "reprocess_requested"
    VERIFICATION_DECISION = "verification_decision"


class EntityType(str, enum.Enum):
    EXTRACTED_RECORD = "extracted_record"
    LAND_RECORD = "land_record"
    RECORD_FIELD = "record_field"
    VERIFICATION_TASK = "verification_task"
    APPROVAL = "approval"


class AuditEvent(BaseRecord):
    """Immutable audit log entry. Never updated after creation."""
    __tablename__ = "audit_events"

    record_id = Column(Integer, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    action_type = Column(SAEnum(ActionType), nullable=False, index=True)
    entity_type = Column(SAEnum(EntityType), nullable=False)
    entity_id = Column(Integer, nullable=True)
    user_id = Column(Integer, nullable=True, index=True)
    meta = Column(JSON, nullable=True)
