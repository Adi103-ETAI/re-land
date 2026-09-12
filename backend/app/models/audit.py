"""Immutable audit log models."""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.models.base import Base, BaseRecord
import enum

class ActionType(str, enum.Enum):
    UPLOAD = "upload"
    CLASSIFY = "classify"
    PROCESS = "process"
    RETRY = "retry"
    EXTRACT = "extract"
    VALIDATE = "validate"
    CORRECT = "correct"
    ACCEPT = "accept"
    REJECT = "reject"
    ESCALATE = "escalate"
    APPROVE = "approve"
    EXPORT = "export"
    SYNC = "sync"
    ROLE_CHANGE = "role_change"
    SCOPE_CHANGE = "scope_change"
    CONFIG_CHANGE = "config_change"

class EntityType(str, enum.Enum):
    BATCH = "batch"
    DOCUMENT = "document"
    RECORD = "record"
    USER = "user"
    CONFIG = "config"
    VALIDATION = "validation"

class AuditEvent(Base, BaseRecord):
    """Immutable log entry recording a state-changing action."""
    __tablename__ = "audit_events"
    
    actor_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    action = Column(SAEnum(ActionType), nullable=False, index=True)
    entity_type = Column(SAEnum(EntityType), nullable=False, index=True)
    entity_id = Column(Integer, nullable=False, index=True)
    previous_value = Column(String, nullable=True)
    new_value = Column(String, nullable=True)
    reason = Column(String, nullable=True)
    source = Column(String, nullable=True)  # Which pipeline stage/UI/API called it
    approval_level = Column(String, nullable=True)  # AUTO/FIRST/SECOND
    metadata_json = Column(String, nullable=True)  # Additional structured metadata
    
    actor = relationship("User", foreign_keys=[actor_id])
    
    # Append-only: no UPDATE or DELETE permitted (enforced at DB permission level)
    __table_args__ = (
        # Ensure audit events are never modified
        {'extend_existing': True}
    )