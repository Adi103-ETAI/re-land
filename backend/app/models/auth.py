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


class Session(BaseRecord):
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
