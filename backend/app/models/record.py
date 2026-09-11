"""Trusted Land Record and spatial models."""
from sqlalchemy import Column, String, Integer, Float, ForeignKey, Enum as SAEnum, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseRecord
import enum

class LandRecord(BaseRecord):
    """Validated, approved, structured representation of a land record."""
    __tablename__ = "land_records"
    
    extracted_record_id = Column(Integer, ForeignKey('extracted_records.id'), unique=True, nullable=False)
    approved_at = Column(String, nullable=False)
    current_snapshot = Column(JSON, nullable=True)
    
    extracted_record = relationship("ExtractedRecord", back_populates="land_record")
    ownership_histories = relationship("OwnershipHistory", back_populates="land_record", cascade="all, delete-orphan")
    mutation_records = relationship("MutationRecord", back_populates="land_record", cascade="all, delete-orphan")
    registration_records = relationship("RegistrationRecord", back_populates="land_record", cascade="all, delete-orphan")
    parcels = relationship("Parcel", back_populates="land_record", cascade="all, delete-orphan")

class OwnershipHistory(BaseRecord):
    """Lifecycle event of ownership transfer."""
    __tablename__ = "ownership_histories"
    
    land_record_id = Column(Integer, ForeignKey('land_records.id'), nullable=False, index=True)
    prior_owner = Column(String, nullable=True)
    new_owner = Column(String, nullable=False)
    effective_date = Column(String, nullable=True)
    source_reference = Column(String, nullable=True)
    
    land_record = relationship("LandRecord", back_populates="ownership_histories")

class MutationRecord(BaseRecord):
    """Mutation/change record in land ownership."""
    __tablename__ = "mutation_records"
    
    land_record_id = Column(Integer, ForeignKey('land_records.id'), nullable=False, index=True)
    mutation_type = Column(String, nullable=False)
    details = Column(JSON, nullable=True)
    source_reference = Column(String, nullable=True)
    
    land_record = relationship("LandRecord", back_populates="mutation_records")

class RegistrationRecord(BaseRecord):
    """Registration information for the land record."""
    __tablename__ = "registration_records"
    
    land_record_id = Column(Integer, ForeignKey('land_records.id'), nullable=False, index=True)
    registration_number = Column(String, nullable=True)
    date = Column(String, nullable=True)
    source_reference = Column(String, nullable=True)
    
    land_record = relationship("LandRecord", back_populates="registration_records")

class Parcel(BaseRecord):
    """Spatial/administrative unit a Land Record refers to."""
    __tablename__ = "parcels"
    
    survey_number = Column(String, nullable=False, index=True)
    khasra_number = Column(String, nullable=True)
    area_hectares = Column(Float, nullable=True)
    land_classification = Column(String, nullable=True)
    land_record_id = Column(Integer, ForeignKey('land_records.id'), nullable=True, index=True)
    
    land_record = relationship("LandRecord", back_populates="parcels")
    gis_references = relationship("GISReference", back_populates="parcel", cascade="all, delete-orphan")

class GISReference(BaseRecord):
    """Link between a Parcel/Survey and its cadastral geometry."""
    __tablename__ = "gis_references"
    
    parcel_id = Column(Integer, ForeignKey('parcels.id'), nullable=False, index=True)
    geometry = Column(JSON, nullable=True)
    source = Column(String, nullable=False)
    
    parcel = relationship("Parcel", back_populates="gis_references")
