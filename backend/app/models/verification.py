"""Human verification and approval models."""
from sqlalchemy import Column, String, Integer, DateTime, Float, ForeignKey, Enum as SAEnum, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base, BaseRecord
import enum

class VerificationPriority(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ESCALATED = "escalated"

class VerificationActionType(str, enum.Enum):
    ACCEPT = "accept"
    CORRECT = "correct"
    REJECT = "reject"
    REPROCESS = "reprocess"
    ESCALATE = "escalate"

class ApprovalLevel(str, enum.Enum):
    AUTO = "auto"
    FIRST = "first"
    SECOND = "second"

class ApprovalDecision(str, enum.Enum):
    APPROVED = "approved"
    REJECTED = "rejected"

class VerificationTask(BaseRecord):
    """Unit of human review work created when a record needs attention."""
    __tablename__ = "verification_tasks"
    
    extracted_record_id = Column(Integer, ForeignKey('extracted_records.id'), nullable=False, index=True)
    assigned_to_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    reason = Column(String, nullable=False)
    priority = Column(SAEnum(VerificationPriority), default=VerificationPriority.MEDIUM)
    status = Column(SAEnum(VerificationStatus), default=VerificationStatus.PENDING, index=True)
    
    record = relationship("ExtractedRecord", back_populates="verification_tasks")
    assigned_to = relationship("User", back_populates="verification_tasks_assigned")
    actions = relationship("VerificationAction", back_populates="task", cascade="all, delete-orphan")

class VerificationAction(BaseRecord):
    """Single action taken on a Verification Task."""
    __tablename__ = "verification_actions"
    
    verification_task_id = Column(Integer, ForeignKey('verification_tasks.id'), nullable=False, index=True)
    actor_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    action_type = Column(SAEnum(VerificationActionType), nullable=False)
    field_changes = Column(JSON, nullable=True)  # {field_name: {old, new}}
    reason = Column(String, nullable=True)
    
    task = relationship("VerificationTask", back_populates="actions")
    actor = relationship("User", back_populates="verification_actions")

class Approval(BaseRecord):
    """Decision event that moves an Extracted Record toward becoming a Land Record."""
    __tablename__ = "approvals"
    
    extracted_record_id = Column(Integer, ForeignKey('extracted_records.id'), nullable=False, index=True)
    level = Column(SAEnum(ApprovalLevel), nullable=False)
    decided_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    decision = Column(SAEnum(ApprovalDecision), nullable=False)
    timestamp = Column(String, nullable=False)  # ISO format
    reason = Column(String, nullable=True)
    
    record = relationship("ExtractedRecord", back_populates="approvals")
    decided_by = relationship("User", foreign_keys=[decided_by_id])