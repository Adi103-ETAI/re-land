"""Pipeline processing models."""
from sqlalchemy import Column, String, Integer, Enum as SAEnum, JSON, DateTime, ForeignKey, Float
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
    FAILED = "failed"
    RETRYING = "retrying"


class ProcessingJob(BaseRecord):
    __tablename__ = "processing_jobs"
    document_id = Column(Integer, nullable=False)
    current_stage = Column(String, nullable=True)
    overall_status = Column(String, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


class ProcessingStage(BaseRecord):
    __tablename__ = "processing_stages"
    job_id = Column(Integer, ForeignKey('processing_jobs.id'), nullable=False)
    stage_name = Column(String, nullable=False)
    status = Column(SAEnum(StageStatus), nullable=False)
    progress_percentage = Column(Float, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


class ProcessingAttempt(BaseRecord):
    __tablename__ = "processing_attempts"
    stage_id = Column(Integer, ForeignKey('processing_stages.id'), nullable=False)
    attempt_number = Column(Integer, nullable=False)
    config_used = Column(JSON, nullable=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    outcome = Column(String, nullable=True)
    failure_reason = Column(String, nullable=True)
    failure_category = Column(String, nullable=True)
