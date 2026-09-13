"""User authentication and RBAC models.

NOTE: the canonical ``User`` model lives in ``app.models.auth`` (used by the
auth service and API). It is re-exported here for import compatibility —
defining a second ``User`` with the same ``users`` table name corrupts the
SQLAlchemy registry (merged columns / NOT NULL conflicts).
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.models.base import Base, BaseRecord
from app.models.auth import User, UserRole  # noqa: F401 — canonical re-export
import enum

class UserRole(str, enum.Enum):
    DIGITIZATION_OFFICER = "digitization_officer"
    VERIFICATION_OFFICER = "verification_officer"
    SENIOR_OFFICER = "senior_officer"
    AUDITOR = "auditor"
    ADMINISTRATOR = "administrator"

class OrgLevel(str, enum.Enum):
    STATE = "state"
    DISTRICT = "district"
    TEHSIL = "tehsil"
    VILLAGE = "village"

class OrganizationUnit(Base, BaseRecord):
    """Geographic/administrative unit (State -> District -> Tehsil -> Village)."""
    __tablename__ = "organization_units"
    
    name = Column(String, nullable=False)
    level = Column(SAEnum(OrgLevel), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey('organization_units.id'), nullable=True, index=True)
    parent = relationship("OrganizationUnit", remote_side="OrganizationUnit.id", backref="children")

class RolePermission(Base, BaseRecord):
    """Permissions tied to roles."""
    __tablename__ = "role_permissions"
    
    role = Column(SAEnum(UserRole), nullable=False, primary_key=True)
    permission = Column(String, nullable=False, primary_key=True)
    description = Column(String)
    
    __table_args__ = ()