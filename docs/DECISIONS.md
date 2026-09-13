# LANDLENS — Design Decision Log

> Related: [README](./README.md) · [01-PRODUCT-REQUIREMENTS](./01-PRODUCT-REQUIREMENTS.md)

This log records significant **[LLD]** design decisions made while producing this documentation set, with the reasoning behind each. It is additive — new decisions get appended, existing ones are not silently rewritten (if a decision changes, record the change and the reason, don't erase the history).

---

**D-001**
Decision: Bulk ingestion is first-class.
Reason: Government digitization is expected to involve large document collections, not one-off uploads.
Traces: REQ-DOC-001

**D-002**
Decision: Documents and (Extracted) Records are separate entities.
Reason: One document may contain multiple records; collapsing them would break record segmentation and evidence tracing.
Traces: REQ-DOC-002, REQ-REC-001

**D-003**
Decision: Processing is resumable at the stage level, per document.
Reason: Large batches should not restart from zero after a single stage failure.
Traces: REQ-AI-002

**D-004**
Decision: Human verification is exception-driven, not applied to every record.
Reason: Manual verification of every record would eliminate much of the benefit of automation.
Traces: REQ-HUMAN-001

**D-005**
Decision: Extraction confidence and validation/trust confidence are modeled as separate concepts.
Reason: An AI can read a value confidently while that value conflicts with authoritative data — conflating the two would hide real risk.
Traces: REQ-VAL-001, REQ-VAL-005

**D-006**
Decision: Human corrections are retained as feedback data, alongside (never overwriting) the original AI value.
Reason: Corrections are essential for auditability now and for evaluation/future model improvement later.
Traces: REQ-HUMAN-004, REQ-EVAL-002

**D-007**
Decision: Government integrations are abstracted behind connectors, with mock/synthetic implementations during the SIH prototype.
Reason: Actual government APIs (LRMS/DILRMP) are not confirmed available during SIH development; the architecture must not depend on them existing to function.
Traces: REQ-API-001

**D-008**
Decision: A modular validation engine with independently pluggable checks, rather than one monolithic scoring function.
Reason: SIH requires validation via business rules, master data, duplicate detection, and consistency checks — these are heterogeneous concerns that must be addable/removable independently.
Traces: REQ-VAL-002, REQ-VAL-003

**D-009**
Decision: A risk-based, three-tier approval model (SAFE auto-approve / REVIEW human verify / HIGH-RISK second-level approval), explicitly labeled as an LLD proposal rather than an official government hierarchy.
Reason: Balances automation benefit against the need for human judgment on genuinely risky records, without inventing government policy.
Traces: REQ-HUMAN-003

**D-010**
Decision: RBAC is modeled as Role + Organizational Scope + Action Permission, not a flat role list.
Reason: Supports future State→District→Tehsil→Village scoping without a redesign; avoids assuming unrestricted access for any role.
Traces: REQ-RBAC-001

**D-011**
Decision: Audit events are insert-only, enforced at the database permission layer.
Reason: An audit trail that the application itself can edit is not a trustworthy audit trail.
Traces: REQ-AUDIT-001

**D-012**
Decision: Never retrain production models directly on incoming corrections; corrections flow through quality filtering → candidate dataset → golden-set evaluation → gated deployment.
Reason: Prevents unvetted regressions from reaching production and keeps model changes measurable.
Traces: REQ-EVAL-002

**D-013**
Decision: Retain the existing Next.js/React/FastAPI stack rather than rewriting; add PostgreSQL+PostGIS, object storage, and a durable queue as the primary net-new infrastructure.
Reason: The current codebase's frontend and API shape are sound; the actual gaps are persistence, async durability, and validation depth — not framework choice.
Traces: REQ-AI-001, REQ-AI-002, REQ-REC-001

**D-014**
Decision: Information architecture is organized around officer tasks (Batches, Documents, Records, Verification, GIS, Analytics, Audit, Integrations, Administration) rather than mirroring pipeline stages one-to-one as the current 10 pages do.
Reason: Task-oriented navigation reduces cognitive load for officers who care about "what needs my attention," not which internal stage a document is in.
Traces: REQ-HUMAN-002, REQ-ANALYTICS-002

**D-015**
Decision: Any screen or dataset backed by mock/synthetic/sample data carries a persistent, unmissable label.
Reason: Prevents demo/prototype data from ever being mistaken for an official land record — a stated non-goal violation would be serious.
Traces: cross-cutting (REQ-DOC-003, REQ-API-002, REQ-GIS-001)

---

Additional decisions should be appended here as the design evolves, following the same `D-NNN / Decision / Reason / Traces` format.
