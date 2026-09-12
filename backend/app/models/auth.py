"""User authentication models for LANDLENS."""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Enum as SAEnum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.models.base import Base, BaseRecord
import enum


class UserRole(str, enum.Enum):
    OPERATOR = "operator"  # Digitization Officer
    VERIFIER = "verifier"  # Verification Officer
    SENIOR = "senior"      # Senior/Supervisory Officer
    AUDITOR = "auditor"
    ADMIN = "admin"


class AuthProvider(str, enum.Enum):
    LOCAL = "local"
    # Future: GOOGLE, GOVERNMENT_SSO


class User(Base, BaseRecord):
    """Officer user account."""
    __tablename__ = "users"
    
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.OPERATOR)
    org_scope = Column(JSON, nullable=True)  # {district, tehsil, village}
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    provider = Column(SAEnum(AuthProvider), default=AuthProvider.LOCAL)
    
    # Relationships
    verification_tasks_assigned = relationship("VerificationTask", back_populates="assigned_to")
    verification_actions = relationship("VerificationAction", back_populates="actor")
    audit_events = relationship("AuditEvent", back_populates="actor")
    approvals_made = relationship("Approval", back_populates="decided_by")


class Session(Base, BaseRecord):
    """Auth session token."""
    __tablename__ = "sessions"
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String(512), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(512), nullable=True)
    
    user = relationship("User")


class RefreshToken(Base, BaseRecord):
    """Refresh token for session renewal."""
    __tablename__ = "refresh_tokens"
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String(512), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False)
    
    user = relationship("User")
