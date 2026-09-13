"""User authentication models for LANDLENS.

The unified identity model lives in app.models.user (User / UserRole).
This module keeps the auth-session tables and re-exports the shared classes
so `from app.models.auth import User` keeps working for the auth service.
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.models.base import BaseRecord
from app.models.user import User, UserRole  # unified identity model — re-export

__all__ = ["User", "UserRole", "AuthProvider", "Session", "RefreshToken"]


class AuthProvider(str):
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
    
    # Relationships (explicit foreign_keys — several tables reference users.id)
    verification_tasks_assigned = relationship(
        "VerificationTask", foreign_keys="VerificationTask.assigned_to_id",
        back_populates="assigned_to"
    )
    verification_actions = relationship(
        "VerificationAction", foreign_keys="VerificationAction.actor_id",
        back_populates="actor"
    )
    audit_events = relationship("AuditEvent", foreign_keys="AuditEvent.actor_id")
    approvals_made = relationship("Approval", foreign_keys="Approval.decided_by_id")


class Session(Base, BaseRecord):
    """Auth session token."""
    __tablename__ = "sessions"

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String(512), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(512), nullable=True)

    user = relationship("User")


class RefreshToken(BaseRecord):
    """Refresh token for session renewal."""
    __tablename__ = "refresh_tokens"

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String(512), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False)

    user = relationship("User")
