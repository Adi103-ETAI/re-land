"""User authentication and RBAC models."""
from sqlalchemy import Column, String, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.models.base import Base, BaseRecord
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
    parent = relationship("OrganizationUnit", remote_side=[id], backref="children")
    
    users = relationship("User", back_populates="org_unit")

class User(Base, BaseRecord):
    """System user with role and organizational scope."""
    __tablename__ = "users"
    
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(SAEnum(UserRole), nullable=False, index=True)
    org_unit_id = Column(Integer, ForeignKey('organization_units.id'), nullable=False)
    
    org_unit = relationship("OrganizationUnit", back_populates="users")
    
    # Relationships
    batches_created = relationship("Batch", back_populates="created_by", foreign_keys="[Batch.created_by_id]")
    audit_events = relationship("AuditEvent", back_populates="actor")
    verification_tasks_assigned = relationship("VerificationTask", back_populates="assigned_to", foreign_keys="[VerificationTask.assigned_to_id]")
    verification_actions = relationship("VerificationAction", back_populates="actor")
    approvals = relationship("Approval", back_populates="decided_by")

class RolePermission(Base, BaseRecord):
    """Permissions tied to roles."""
    __tablename__ = "role_permissions"
    
    role = Column(SAEnum(UserRole), nullable=False, primary_key=True)
    permission = Column(String, nullable=False, primary_key=True)
    description = Column(String)
    
    __table_args__ = ()