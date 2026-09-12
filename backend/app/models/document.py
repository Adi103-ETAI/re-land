"""Document ingestion and classification models."""
from sqlalchemy import Column, String, Integer, DateTime, Float, Boolean, ForeignKey, Enum as SAEnum, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from app.models.base import Base, BaseRecord
import enum
from datetime import datetime, timezone

class DocumentStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    QUEUED = "queued"
    CLASSIFYING = "classifying"
    PREPROCESSING = "preprocessing"
    LAYOUT_ANALYSIS = "layout_analysis"
    OCR_PROCESSING = "ocr_processing"
    EXTRACTING = "extracting"
    RECORD_SEGMENTED = "record_segmented"
    VALIDATING = "validating"
    DECISIONED = "decisioned"
    RETRYING = "retrying"
    FAILED = "failed"

class DocumentType(str, enum.Enum):
    LAND_RECORD = "land_record"
    MUTATION_RECORD = "mutation_record"
    REGISTRATION_DEED = "registration_deed"
    OWNERSHIP_CERTIFICATE = "ownership_certificate"
    TAX_RECEIPT = "tax_receipt"
    OTHER = "other"

class Batch(BaseRecord):
    """Group of documents submitted together by an officer."""
    __tablename__ = "batches"
    
    original_filename = Column(String, nullable=False)
    total_documents = Column(Integer, default=0)
    status = Column(SAEnum(DocumentStatus), default=DocumentStatus.UPLOADED, index=True)
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    created_by = relationship("User", back_populates="batches_created")
    documents = relationship("Document", back_populates="batch", cascade="all, delete-orphan")

class Document(BaseRecord):
    """Single uploaded source artifact. Immutable once uploaded."""
    __tablename__ = "documents"
    
    batch_id = Column(Integer, ForeignKey('batches.id'), nullable=False, index=True)
    original_filename = Column(String, nullable=False)
    storage_reference = Column(String, nullable=False)  # S3/object storage key
    checksum_hash = Column(String, unique=True, index=True, nullable=False)
    uploaded_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    status = Column(SAEnum(DocumentStatus), default=DocumentStatus.UPLOADED, index=True)
    
    batch = relationship("Batch", back_populates="documents")
    uploaded_by = relationship("User")
    pages = relationship("DocumentPage", back_populates="document", cascade="all, delete-orphan")
    classification = relationship("DocumentClassification", back_populates="document", uselist=False, cascade="all, delete-orphan")
    processing_jobs = relationship("ProcessingJob", back_populates="document", cascade="all, delete-orphan")
    extracted_records = relationship("ExtractedRecord", back_populates="document", cascade="all, delete-orphan")

class DocumentPage(BaseRecord):
    """One page within a Document."""
    __tablename__ = "document_pages"
    
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False, index=True)
    page_number = Column(Integer, nullable=False)
    image_storage_reference = Column(String, nullable=False)
    orientation = Column(Integer, nullable=True)  # degrees rotation needed
    quality_flags = Column(JSON, nullable=True)  # blur, skew, damage flags
    
    document = relationship("Document", back_populates="pages")
    ocr_results = relationship("OCRResult", back_populates="page", cascade="all, delete-orphan")
    layout_regions = relationship("LayoutRegion", back_populates="page", cascade="all, delete-orphan")
    extracted_records = relationship("ExtractedRecord", secondary="extracted_record_pages", back_populates="pages")

class DocumentClassification(BaseRecord):
    """AI determination of document properties."""
    __tablename__ = "document_classifications"
    
    document_id = Column(Integer, ForeignKey('documents.id'), unique=True, nullable=False)
    document_type = Column(SAEnum(DocumentType), nullable=True, index=True)
    languages = Column(JSON, nullable=True)  # Detected language(s)/script
    has_handwriting = Column(Boolean, default=False)
    has_tables = Column(Boolean, default=False)
    has_maps = Column(Boolean, default=False)
    multi_record_likelihood = Column(Float, nullable=True)  # 0.0-1.0 probability
    model_version_id = Column(Integer, ForeignKey('model_versions.id'), nullable=True)
    
    document = relationship("Document", back_populates="classification")
    model = relationship("ModelVersion")