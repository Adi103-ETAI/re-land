"""Verification workflow models."""
from sqlalchemy import Column, String, Integer, ForeignKey, Enum as SAEnum, JSON, Text
from sqlalchemy.orm import relationship
from app.models.base import Base, BaseRecord
import enum


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"
    ESCALATED = "escalated"
    PENDING_REPROCESS = "pending_reprocess"


class VerificationAction(str, enum.Enum):
    ACCEPT = "accept"
    CORRECT = "correct"
    REJECT = "reject"
    REPROCESS = "reprocess"
    ESCALATE = "escalate"


class ApprovalDecision(str, enum.Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    CORRECTED = "corrected"


class Approval(BaseRecord):
    """Immutable record of a human verification decision."""
    __tablename__ = "approval_decisions"

    record_id = Column(Integer, ForeignKey('extracted_records.id'), nullable=False, index=True)
    decision = Column(SAEnum(ApprovalDecision), nullable=False)
    officer_id = Column(Integer, nullable=False, index=True)
    reason = Column(Text, nullable=True)
    field_changes = Column(JSON, nullable=True)

    record = relationship("ExtractedRecord", back_populates="approvals")


class VerificationTask(BaseRecord):
    """Human verification task assigned to an officer."""
    __tablename__ = "verification_tasks_v2"

    record_id = Column(Integer, ForeignKey('extracted_records.id'), nullable=False, index=True)
    officer_id = Column(Integer, nullable=True, index=True)
    status = Column(SAEnum(TaskStatus), default=TaskStatus.PENDING, index=True)
    priority = Column(String, nullable=True, default="normal")
    assigned_at = Column(String, nullable=True)
    completed_at = Column(String, nullable=True)

    record = relationship("ExtractedRecord", back_populates="verification_tasks")
