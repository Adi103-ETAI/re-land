"""Validation engine models."""
from sqlalchemy import Column, String, Integer, Float, ForeignKey, Enum as SAEnum, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base, BaseRecord
import enum

class CheckStatus(str, enum.Enum):
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"
    INCONCLUSIVE = "inconclusive"

class CheckSeverity(str, enum.Enum):
    INFORMATIONAL = "informational"
    MINOR = "minor"
    MAJOR = "major"
    CRITICAL = "critical"

class ConflictResolution(str, enum.Enum):
    PENDING = "pending"
    RESOLVED = "resolved"
    IGNORED = "ignored"
    ESCALATED = "escalated"

class ValidationRun(Base, BaseRecord):
    """One execution of the validation engine against an Extracted Record."""
    __tablename__ = "validation_runs"
    
    extracted_record_id = Column(Integer, ForeignKey('extracted_records.id'), nullable=False, index=True)
    run_at = Column(String, nullable=False)  # ISO format timestamp string
    model_or_ruleset_version = Column(String, nullable=False)
    overall_trust_score = Column(Float, nullable=True)
    
    record = relationship("ExtractedRecord", back_populates="validation_runs")
    checks = relationship("ValidationCheck", back_populates="run", cascade="all, delete-orphan")

class ValidationCheck(Base, BaseRecord):
    """One rule/comparison executed during a Validation Run."""
    __tablename__ = "validation_checks"
    
    validation_run_id = Column(Integer, ForeignKey('validation_runs.id'), nullable=False, index=True)
    check_name = Column(String, nullable=False, index=True)
    status = Column(SAEnum(CheckStatus), nullable=False)
    severity = Column(SAEnum(CheckSeverity), nullable=False)
    expected_value = Column(String, nullable=True)
    actual_value = Column(String, nullable=True)
    source = Column(String, nullable=False)  # Which reference/rule produced this
    reason = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    
    run = relationship("ValidationRun", back_populates="checks")
    conflicts = relationship("ValidationConflict", back_populates="check", cascade="all, delete-orphan")
    
    __table_args__ = (
        # One check per name per run
        UniqueConstraint('validation_run_id', 'check_name', name='uq_run_check'),
    )

class ValidationConflict(Base, BaseRecord):
    """A Validation Check result indicating a mismatch requiring attention."""
    __tablename__ = "validation_conflicts"
    
    validation_check_id = Column(Integer, ForeignKey('validation_checks.id'), nullable=False, index=True)
    conflict_type = Column(String, nullable=False)
    resolution_status = Column(SAEnum(ConflictResolution), default=ConflictResolution.PENDING)
    resolved_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    resolution_note = Column(String, nullable=True)
    resolved_at = Column(String, nullable=True)
    
    check = relationship("ValidationCheck", back_populates="conflicts")
    resolver = relationship("User", foreign_keys=[resolved_by_id])