"""OCR and extraction models."""
from sqlalchemy import Column, String, Integer, Float, ForeignKey, Enum as SAEnum, JSON, Table, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
from app.models.base import Base, BaseRecord
from datetime import datetime, timezone
import enum

extracted_record_pages = Table(
    'extracted_record_pages',
    Base.metadata,
    Column('extracted_record_id', Integer, ForeignKey('extracted_records.id'), primary_key=True),
    Column('page_id', Integer, ForeignKey('document_pages.id'), primary_key=True)
)

class Document(BaseRecord):
    __tablename__ = "documents"
    document_type = Column(String, nullable=True)
    extracted_records = relationship("ExtractedRecord", back_populates="document")

class DocumentPage(BaseRecord):
    __tablename__ = "document_pages"
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    extracted_records = relationship("ExtractedRecord", secondary=extracted_record_pages, back_populates="pages")
    ocr_results = relationship("OCRResult", back_populates="page")
    layout_regions = relationship("LayoutRegion", back_populates="page")
    field_evidences = relationship("FieldEvidence", back_populates="page")

class OrganizationUnit(BaseRecord):
    __tablename__ = "organization_units"
    name = Column(String, nullable=False)
    unit_type = Column(String, nullable=True)

class ModelVersion(BaseRecord):
    __tablename__ = "model_versions"
    version = Column(String, nullable=False)
    stage = Column(String, nullable=True)

class Approval(BaseRecord):
    __tablename__ = "approvals"
    record_id = Column(Integer, ForeignKey('extracted_records.id'), nullable=False)
    status = Column(String, nullable=True)
    record = relationship("ExtractedRecord", back_populates="approvals")

class VerificationTask(BaseRecord):
    __tablename__ = "verification_tasks"
    record_id = Column(Integer, ForeignKey('extracted_records.id'), nullable=False)
    priority = Column(String, nullable=True)
    record = relationship("ExtractedRecord", back_populates="verification_tasks")

class RecordStatus(str, enum.Enum):
    EXTRACTED = "extracted"
    VALIDATING = "validating"
    SAFE = "safe"
    REVIEW = "review"
    HIGH_RISK = "high_risk"
    AUTO_APPROVED = "auto_approved"
    HUMAN_REVIEW = "human_review"
    CORRECTED = "corrected"
    REJECTED = "rejected"
    ESCALATED = "escalated"

class LayoutRegionType(str, enum.Enum):
    TABLE = "table"
    PARAGRAPH = "paragraph"
    STAMP = "stamp"
    SIGNATURE = "signature"
    MAP = "map"
    HEADER = "header"
    FOOTER = "footer"
    OTHER = "other"

class OCRResult(BaseRecord):
    __tablename__ = "ocr_results"
    
    page_id = Column(Integer, ForeignKey('document_pages.id'), nullable=False, index=True)
    region_id = Column(Integer, ForeignKey('layout_regions.id'), nullable=True)
    recognized_text = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    language = Column(String, nullable=True)
    bounding_box = Column(JSON, nullable=True)
    engine = Column(String, nullable=False)
    model_version_id = Column(Integer, ForeignKey('model_versions.id'), nullable=True)
    
    page = relationship("DocumentPage", back_populates="ocr_results")
    region = relationship("LayoutRegion")
    model = relationship("ModelVersion")
    field_evidences = relationship("FieldEvidence", back_populates="ocr_result", cascade="all, delete-orphan")

class LayoutRegion(BaseRecord):
    __tablename__ = "layout_regions"
    
    page_id = Column(Integer, ForeignKey('document_pages.id'), nullable=False, index=True)
    region_type = Column(SAEnum(LayoutRegionType), nullable=False)
    bounding_box = Column(JSON, nullable=True)
    
    page = relationship("DocumentPage", back_populates="layout_regions")
    ocr_results = relationship("OCRResult", back_populates="region")

class ExtractedRecord(BaseRecord):
    __tablename__ = "extracted_records"
    
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False, index=True)
    document_type = Column(String, nullable=True)
    status = Column(SAEnum(RecordStatus), default=RecordStatus.EXTRACTED, index=True)
    extraction_confidence = Column(Float, nullable=True)
    validation_score = Column(Float, nullable=True)
    
    document = relationship("Document", back_populates="extracted_records")
    pages = relationship("DocumentPage", secondary=extracted_record_pages, back_populates="extracted_records")
    fields = relationship("RecordField", back_populates="record", cascade="all, delete-orphan")
    validation_runs = relationship("ValidationRun", back_populates="record", cascade="all, delete-orphan")
    verification_tasks = relationship("VerificationTask", back_populates="record", cascade="all, delete-orphan")
    approvals = relationship("Approval", back_populates="record", cascade="all, delete-orphan")
    land_record = relationship("LandRecord", back_populates="extracted_record", uselist=False, cascade="all, delete-orphan")

class RecordField(BaseRecord):
    __tablename__ = "record_fields"
    
    extracted_record_id = Column(Integer, ForeignKey('extracted_records.id'), nullable=False, index=True)
    field_name = Column(String, nullable=False, index=True)
    original_value = Column(String, nullable=False)
    normalized_value = Column(String, nullable=True)
    ai_value = Column(String, nullable=False)
    ai_confidence = Column(Float, nullable=False)
    human_value = Column(String, nullable=True)
    final_value = Column(String, nullable=False)
    language = Column(String, nullable=True)
    
    record = relationship("ExtractedRecord", back_populates="fields")
    evidences = relationship("FieldEvidence", back_populates="record_field_ref", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint('extracted_record_id', 'field_name', name='uq_record_field'),
    )

class FieldEvidence(BaseRecord):
    __tablename__ = "field_evidences"
    
    record_field_id = Column(Integer, ForeignKey('record_fields.id'), nullable=False, index=True)
    ocr_result_id = Column(Integer, ForeignKey('ocr_results.id'), nullable=False, index=True)
    page_id = Column(Integer, ForeignKey('document_pages.id'), nullable=False, index=True)
    bounding_box = Column(JSON, nullable=True)
    
    record_field_ref = relationship("RecordField", back_populates="evidences")
    ocr_result = relationship("OCRResult", back_populates="field_evidences")
    page = relationship("DocumentPage")