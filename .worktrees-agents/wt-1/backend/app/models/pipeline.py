"""Pipeline processing state models."""
from sqlalchemy import Column, String, Integer, DateTime, Float, Boolean, ForeignKey, Enum as SAEnum, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from app.models.base import Base, BaseRecord
import enum

class StageName(str, enum.Enum):
    DOCUMENT_CLASSIFICATION = "document_classification"
    LANGUAGE_DETECTION = "language_detection"
    PAGE_ANALYSIS = "page_analysis"
    IMAGE_PREPROCESSING = "image_preprocessing"
    LAYOUT_REGION_DETECTION = "layout_region_detection"
    OCR_HANDWRITING_RECOGNITION = "ocr_handwriting_recognition"
    RECORD_SEGMENTATION = "record_segmentation"
    FIELD_EXTRACTION = "field_extraction"
    FIELD_CLASSIFICATION = "field_classification"
    NORMALIZATION = "normalization"
    RECORD_RECONSTRUCTION = "record_reconstruction"
    VALIDATION = "validation"
    DECISION = "decision"

class StageStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    RETRYING = "retrying"
    FAILED = "failed"

class ProcessingJob(Base, BaseRecord):
    """Asynchronous unit of work carrying a Document through pipeline stages."""
    __tablename__ = "processing_jobs"
    
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False, index=True)
    current_stage = Column(SAEnum(StageName), nullable=True, index=True)
    overall_status = Column(SAEnum(StageStatus), default=StageStatus.PENDING, index=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    document = relationship("Document", back_populates="processing_jobs")
    stages = relationship("ProcessingStage", back_populates="job", cascade="all, delete-orphan")

class ProcessingStage(Base, BaseRecord):
    """One named step of the pipeline with its own status."""
    __tablename__ = "processing_stages"
    
    job_id = Column(Integer, ForeignKey('processing_jobs.id'), nullable=False, index=True)
    stage_name = Column(SAEnum(StageName), nullable=False)
    status = Column(SAEnum(StageStatus), default=StageStatus.PENDING, index=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    progress_percentage = Column(Float, default=0.0)
    
    job = relationship("ProcessingJob", back_populates="stages")
    attempts = relationship("ProcessingAttempt", back_populates="stage", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint('job_id', 'stage_name', name='uq_job_stage'),
    )

class ProcessingAttempt(Base, BaseRecord):
    """One try at a Processing Stage. Retries create new attempts."""
    __tablename__ = "processing_attempts"
    
    stage_id = Column(Integer, ForeignKey('processing_stages.id'), nullable=False, index=True)
    attempt_number = Column(Integer, nullable=False)
    config_used = Column(JSON, nullable=True)
    model_version_id = Column(Integer, ForeignKey('model_versions.id'), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    outcome = Column(SAEnum(StageStatus), nullable=False)
    failure_reason = Column(String, nullable=True)
    failure_category = Column(String, nullable=True)
    
    stage = relationship("ProcessingStage", back_populates="attempts")
