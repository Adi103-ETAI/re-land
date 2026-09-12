"""Reference data and evaluation models."""
from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.models.base import Base, BaseRecord
import enum

class DataSourceType(str, enum.Enum):
    VILLAGE_MASTER = "village_master"
    CADASTRAL = "cadastral"
    LRMS = "lrms"
    DILRMP = "dilrmp"
    OTHER = "other"

class ModelStage(str, enum.Enum):
    CLASSIFICATION = "classification"
    OCR = "ocr"
    EXTRACTION = "extraction"
    VALIDATION = "validation"

class ModelStatus(str, enum.Enum):
    DEPLOYED = "deployed"
    TESTING = "testing"
    ARCHIVED = "archived"

class ReferenceDataSource(BaseRecord):
    """External/master dataset used for validation."""
    __tablename__ = "reference_data_sources"
    
    name = Column(String, nullable=False, index=True)
    data_type = Column(SAEnum(DataSourceType), nullable=False)
    is_synthetic = Column(Boolean, default=False, index=True)  # Critical for prototype transparency
    last_synced_at = Column(String, nullable=True)  # ISO format
    source_metadata = Column("metadata", String, nullable=True)
    
    gis_references = relationship("GISReference", back_populates="source_dataset")

class ModelVersion(BaseRecord):
    """Versioned AI/ML model or prompt/config used at some pipeline stage."""
    __tablename__ = "model_versions"
    
    stage = Column(SAEnum(ModelStage), nullable=False, index=True)
    provider_model_name = Column(String, nullable=False)  # e.g., "google/gemini-2.0-flash-exp"
    version_tag = Column(String, nullable=False)
    deployed_at = Column(String, nullable=True)  # ISO format
    status = Column(SAEnum(ModelStatus), default=ModelStatus.TESTING)
    source_metadata = Column("metadata", String, nullable=True)
    
    classifications = relationship("DocumentClassification", back_populates="model")
    ocr_results = relationship("OCRResult", back_populates="model")
    processing_attempts = relationship("ProcessingAttempt", back_populates="model")

class EvaluationDataset(BaseRecord):
    """Curated ground-truth dataset for measuring accuracy."""
    __tablename__ = "evaluation_datasets"
    
    name = Column(String, nullable=False, index=True)
    size = Column(Integer, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(String, nullable=False)  # ISO format
    
    training_feedbacks = relationship("TrainingFeedback", back_populates="dataset")

class TrainingFeedback(BaseRecord):
    """Human correction retained as feedback data for future evaluation."""
    __tablename__ = "training_feedbacks"
    
    record_field_id = Column(Integer, ForeignKey('record_fields.id'), nullable=False, index=True)
    ai_value = Column(String, nullable=False)
    human_value = Column(String, nullable=False)
    included_in_dataset_id = Column(Integer, ForeignKey('evaluation_datasets.id'), nullable=True)
    quality_flag = Column(String, nullable=True)
    
    record_field = relationship("RecordField")
    dataset = relationship("EvaluationDataset", back_populates="training_feedbacks")