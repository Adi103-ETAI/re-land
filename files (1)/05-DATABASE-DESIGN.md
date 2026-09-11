# 05 — Database Design

> Related: [02-DOMAIN-MODEL](./02-DOMAIN-MODEL.md) · [03-WORKFLOW-AND-STATE-MACHINE](./03-WORKFLOW-AND-STATE-MACHINE.md) · [15-AUDIT-AND-PROVENANCE](./15-AUDIT-AND-PROVENANCE.md)
> Traces: REQ-REC-001, REQ-AI-002, REQ-AUDIT-001

## 1. Purpose

Defines entities, relationships, indexing/constraint intent, and lifecycle for LANDLENS's persistent store. This document defines **entities and relationships**, not literal SQL DDL — implementation should translate this into migrations.

## 2. Why Persistence Is First-Class (Principle 12)

The existing prototype keeps job state in an in-memory Python dict (`backend/app/core/jobs.py`), which loses all progress on restart — directly violating REQ-AI-002 (resumability). This design treats persistent storage as a foundational requirement, not an afterthought: **every** Processing Stage, Extracted Record, Validation Check, and Audit Event must survive a process restart.

## 3. Entity Groups

### 3.1 Identity & Access
- **User** — id, name, credentials/identity ref, role(s), organizational scope, status.
- **Role** — id, name, permission set.
- **OrganizationUnit** — id, level (State/District/Tehsil/Village), parent reference.

### 3.2 Ingestion
- **Batch** — id, created_by (User), created_at, status summary, total documents.
- **Document** — id, batch_id, original filename, storage reference (immutable original), checksum/hash, uploaded_by, uploaded_at.
- **DocumentPage** — id, document_id, page_number, image storage reference.
- **DocumentClassification** — document_id, document_type, language(s)/script, has_handwriting, has_tables, has_maps, multi_record_likelihood, model_version_id.

### 3.3 Processing
- **ProcessingJob** — id, document_id, current_stage, overall_status, created_at, updated_at.
- **ProcessingStage** — id, job_id, stage_name (enum per §3 of [03-WORKFLOW-AND-STATE-MACHINE](./03-WORKFLOW-AND-STATE-MACHINE.md)), status, started_at, completed_at.
- **ProcessingAttempt** — id, stage_id, attempt_number, config_used, model_version_id, started_at, ended_at, outcome, failure_reason, failure_category.

### 3.4 OCR & Layout
- **OCRResult** — id, page_id, region_id (nullable), recognized_text, confidence, language, bounding_box, engine/model_version_id.
- **LayoutRegion** — id, page_id, region_type (table/paragraph/stamp/signature/map/etc.), bounding_box.

### 3.5 Extraction
- **ExtractedRecord** — id, document_id, page_ids (many-to-many via a join table for multi-page records), document_type, status (per record-level state machine).
- **RecordField** — id, extracted_record_id, field_name, original_value, normalized_value, ai_value, ai_confidence, human_value (nullable), final_value, language.
- **FieldEvidence** — id, record_field_id, ocr_result_id, page_id, bounding_box.

### 3.6 Validation
- **ValidationRun** — id, extracted_record_id, run_at, model/ruleset_version.
- **ValidationCheck** — id, validation_run_id, check_name, status, severity, expected_value, actual_value, source, reason, confidence.
- **ValidationConflict** — id, validation_check_id, conflict_type, resolution_status.

### 3.7 Human Verification & Approval
- **VerificationTask** — id, extracted_record_id, assigned_to (User), reason, priority, status, created_at.
- **VerificationAction** — id, verification_task_id, actor (User), action_type (accept/correct/reject/reprocess/escalate), field_changes (ref to RecordField diffs), reason, timestamp.
- **Approval** — id, extracted_record_id, level (AUTO/FIRST/SECOND), decided_by (User, nullable for AUTO), decision (approved/rejected), timestamp, reason.

### 3.8 Trusted Records
- **LandRecord** — id, extracted_record_id (origin), approved_at, current field snapshot (denormalized for read performance, sourced from RecordField.final_value).
- **OwnershipHistory** — id, land_record_id, prior_owner, new_owner, effective_date, source_reference.
- **MutationRecord** — id, land_record_id, mutation_type, details, source_reference.
- **RegistrationRecord** — id, land_record_id, registration_number, date, source_reference.

### 3.9 Spatial
- **Parcel** — id, survey_number, village/tehsil/district refs, geometry reference (nullable).
- **Survey** — id, parcel_id, survey_details.
- **GISReference** — id, parcel_id, geometry (PostGIS geometry type), source (real cadastral / synthetic).

### 3.10 Reference & Evaluation
- **ReferenceDataSource** — id, name, type (village master, cadastral, etc.), is_synthetic (boolean — critical for prototype transparency), last_synced_at.
- **ModelVersion** — id, stage, provider/model name, version tag, deployed_at, status.
- **EvaluationDataset** — id, name, created_at, size, description.
- **TrainingFeedback** — id, record_field_id, ai_value, human_value, included_in_dataset_id (nullable), quality_flag.

### 3.11 Audit
- **AuditEvent** — id, actor (User, nullable for system), action, entity_type, entity_id, previous_value, new_value, reason, timestamp, approval_level (nullable). Append-only.

## 4. Key Constraints & Design Rules

- **[LLD]** `RecordField` never overwrites `ai_value` when a `human_value` is set — both columns persist alongside `final_value` (REQ tied to §29 of source prompt). This is the single most important write-path rule in the schema.
- **[LLD]** `AuditEvent` rows are insert-only; no UPDATE/DELETE permitted through the application role (enforced at the DB permission level, not just application logic) — see [15-AUDIT-AND-PROVENANCE](./15-AUDIT-AND-PROVENANCE.md).
- **[LLD]** `Document` originals are never deleted or mutated once uploaded; corrections/reprocessing create new derived rows (OCRResult, ExtractedRecord versions), not replacements of the original.
- **[LLD]** `ReferenceDataSource.is_synthetic` must be surfaced anywhere validation results are shown, so officers know when a "conflict" was checked against synthetic prototype data rather than a real authoritative source.
- Indexing priorities: `Document.batch_id`, `ProcessingStage.(job_id, stage_name)`, `ExtractedRecord.document_id`, `VerificationTask.(assigned_to, status)`, `AuditEvent.(entity_type, entity_id)`, and spatial indexes (GiST) on `GISReference.geometry`.

## 5. Lifecycle Summary

| Entity | Created | Mutated | Deleted |
|---|---|---|---|
| Document | On upload | Never (metadata only, e.g. classification) | Never (retention policy governs archival, not deletion — see [16-SECURITY](./16-SECURITY.md)) |
| ProcessingStage/Attempt | Per stage execution | Status/timestamps only | Never |
| RecordField | On extraction | Append human_value/final_value; ai_value fixed | Never |
| AuditEvent | On any tracked action | Never | Never |
| LandRecord | On approval | New version on later correction (versioned, not overwritten) | Governed by retention policy only |

## 6. Prototype vs Production

- **Prototype:** PostgreSQL (with PostGIS for spatial types) is sufficient for all entities above; object storage (S3-compatible / local) for original Documents and page images; a lightweight job table can substitute for a full queue initially.
- **Production:** Same core schema; adds read replicas / partitioning for AuditEvent and OCRResult at scale, and a managed object store with lifecycle/retention policies.

## 7. Open Questions

- Exact retention period for original Documents and Audit Events (government record-retention rules not specified by SIH docs).
- Whether `LandRecord` versioning should be full-row snapshots or field-level diffs at scale — proposed as field-level diffs (via RecordField history) for the prototype, revisit for production volume.
