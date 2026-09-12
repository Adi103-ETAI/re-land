"""LANDLENS ORM Models.

All database entities defined according to:
- 05-DATABASE-DESIGN.md
- 02-DOMAIN-MODEL.md
- 03-WORKFLOW-AND-STATE-MACHINE.md
"""
from app.models.base import Base
from app.models.user import User, RolePermission, OrganizationUnit, UserRole, OrgLevel
from app.models.document import Batch, Document, DocumentPage, DocumentClassification, DocumentType, DocumentStatus
from app.models.pipeline import ProcessingJob, ProcessingStage, ProcessingAttempt, StageName, StageStatus
from app.models.extraction import (
    ExtractedRecord, RecordField, FieldEvidence, OCRResult, LayoutRegion,
    LayoutRegionType, RecordStatus, extracted_record_pages
)
from app.models.validation import ValidationRun, ValidationCheck, ValidationConflict, CheckStatus, CheckSeverity
from app.models.verification import VerificationTask, VerificationAction, Approval, VerificationPriority
from app.models.record import (
    LandRecord, OwnershipHistory, MutationRecord, RegistrationRecord,
    Parcel, GISReference
)
from app.models.reference import (
    ReferenceDataSource, ModelVersion, EvaluationDataset, TrainingFeedback,
    DataSourceType, ModelStage, ModelStatus
)
from app.models.audit import AuditEvent, ActionType, EntityType

__all__ = [
    'Base',
    'User', 'RolePermission', 'OrganizationUnit', 'UserRole', 'OrgLevel',
    'Batch', 'Document', 'DocumentPage', 'DocumentClassification', 'DocumentType', 'DocumentStatus',
    'ProcessingJob', 'ProcessingStage', 'ProcessingAttempt', 'StageName', 'StageStatus',
    'ExtractedRecord', 'RecordField', 'FieldEvidence', 'OCRResult', 'LayoutRegion',
    'LayoutRegionType', 'RecordStatus', 'extracted_record_pages',
    'ValidationRun', 'ValidationCheck', 'ValidationConflict', 'CheckStatus', 'CheckSeverity',
    'VerificationTask', 'VerificationAction', 'Approval', 'VerificationPriority',
    'LandRecord', 'OwnershipHistory', 'MutationRecord', 'RegistrationRecord',
    'Parcel', 'GISReference',
    'ReferenceDataSource', 'ModelVersion', 'EvaluationDataset', 'TrainingFeedback',
    'DataSourceType', 'ModelStage', 'ModelStatus',
    'AuditEvent', 'ActionType', 'EntityType',
]