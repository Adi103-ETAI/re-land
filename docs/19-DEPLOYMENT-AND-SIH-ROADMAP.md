# 19 — Deployment and SIH Roadmap

> Related: [10-SYSTEM-ARCHITECTURE](./10-SYSTEM-ARCHITECTURE.md) · [16-SECURITY](./16-SECURITY.md) · [18-AI-EVALUATION-AND-CONTINUOUS-LEARNING](./18-AI-EVALUATION-AND-CONTINUOUS-LEARNING.md)
> Traces: all REQ-* (roadmap sequences delivery of the full requirement set)

## 1. Purpose

Defines the prototype-vs-production boundary explicitly, and proposes a staged delivery roadmap building from the current ~60%-scaffolded backend toward the full design in this documentation set.

## 2. Prototype vs Production — Consolidated

| Dimension | SIH Prototype | Production |
|---|---|---|
| Reference/master data | Synthetic, clearly labeled | Real authoritative sources, where integration is granted |
| Government connectors (LRMS/DILRMP) | Mocked | Real, credentialed |
| Database | Single PostgreSQL+PostGIS instance | Managed, backed up, possibly replicated |
| Job execution | Simple background task acceptable initially | Durable queue + worker pool |
| Auth | Simplified login | Full identity provider / possible government SSO |
| Models | Limited coverage (e.g. one or two VLM providers) | Domain-tuned ensemble, evaluated via golden dataset |
| Sample documents | A curated demo/golden set | Full-scale document intake |
| Security | Practices in place, not certified | Practices in place, certification pursued if required |

**[LLD]** The prototype should never be made *unnecessarily dependent* on unavailable government infrastructure (source prompt §37) — every mocked dependency has a clearly defined swap point (the connector layer in [11-API-AND-GOVERNMENT-INTEGRATION](./11-API-AND-GOVERNMENT-INTEGRATION.md)).

## 3. Technology Direction (source prompt §38)

**[LLD]** Retain the current stack rather than rewriting from scratch:

**Frontend (retained):** Next.js, React, TypeScript, Tailwind, Zustand (for local UI state only — not system-of-record state, per [12-INFORMATION-ARCHITECTURE](./12-INFORMATION-ARCHITECTURE.md) §5), Chart.js, Leaflet.

**Backend (retained):** FastAPI, Python.

**Added for this design (not yet in the codebase):**
- PostgreSQL + PostGIS (persistent system of record — replaces in-memory `jobs.py`)
- Object storage (S3-compatible) for originals/page images
- Redis + a task queue (Celery or equivalent) for durable async processing
- A modular validation engine (replacing the current `validate.py` stub)
- A connector abstraction for government integrations (net-new)

**Explicitly not blindly adopted:** every technology suggested in the SIH documentation's tech matrix (Detectron2, YOLO, GeoServer, QGIS, spaCy, Indic NLP Library, Power BI/Superset/Grafana, GraphQL) is evaluated on merit per-document rather than adopted wholesale — see the relevant design docs ([06](./06-AI-PROCESSING-PIPELINE.md), [07](./07-OCR-AND-DOCUMENT-UNDERSTANDING.md), [14](./14-GIS-AND-CADASTRAL-DESIGN.md), [17](./17-ANALYTICS-AND-MONITORING.md)) for which are actually justified now vs. flagged [FUTURE].

## 4. Proposed Staged Roadmap

**[LLD]** — proposed sequencing, not a committed schedule (no dates asserted):

### Phase 1 — Foundations
- Persist core entities (Batch, Document, ProcessingJob/Stage/Attempt, ExtractedRecord, RecordField) to PostgreSQL — closes the single biggest gap (in-memory job store).
- Wire object storage for originals.
- Implement the full Document-level state machine ([03-WORKFLOW-AND-STATE-MACHINE](./03-WORKFLOW-AND-STATE-MACHINE.md)) with real resumability.
- Basic authentication + RBAC skeleton ([04-ROLES-AND-RBAC](./04-ROLES-AND-RBAC.md)).

### Phase 2 — Extraction & Validation Depth
- Expand OCR/extraction to printed + handwriting coverage per [07-OCR-AND-DOCUMENT-UNDERSTANDING](./07-OCR-AND-DOCUMENT-UNDERSTANDING.md).
- Build the modular validation engine ([08-VALIDATION-AND-TRUST-ENGINE](./08-VALIDATION-AND-TRUST-ENGINE.md)) against synthetic reference data.
- Implement the risk-based decision model (SAFE/REVIEW/HIGH-RISK).

### Phase 3 — Human Loop & Audit
- Full Verification Task/Action implementation ([09-HUMAN-VERIFICATION](./09-HUMAN-VERIFICATION.md)), replacing the current stub endpoint.
- Immutable Audit Event logging across all stages ([15-AUDIT-AND-PROVENANCE](./15-AUDIT-AND-PROVENANCE.md)).
- Second-level approval flow.

### Phase 4 — GIS, Analytics, Evaluation
- Spatial validation and parcel visualization against sample cadastral data ([14-GIS-AND-CADASTRAL-DESIGN](./14-GIS-AND-CADASTRAL-DESIGN.md)).
- Real (non-mock) dashboards sourced from persisted data ([17-ANALYTICS-AND-MONITORING](./17-ANALYTICS-AND-MONITORING.md)).
- Golden dataset assembly and first evaluation run ([18-AI-EVALUATION-AND-CONTINUOUS-LEARNING](./18-AI-EVALUATION-AND-CONTINUOUS-LEARNING.md)).

### Phase 5 — Integration Readiness (largely [FUTURE])
- Government connector interfaces fully abstracted and mock-tested ([11-API-AND-GOVERNMENT-INTEGRATION](./11-API-AND-GOVERNMENT-INTEGRATION.md)).
- Security hardening pass ([16-SECURITY](./16-SECURITY.md)) — secret rotation, auth upgrade path, file-scanning.
- Durable queue/worker pool for scale.

This phasing roughly follows the existing project's own `PLAN.md` staged approach (preprocess → layout → golden-train → human-loop) while extending it to cover the full documentation set's scope.

## 5. What This Roadmap Deliberately Does Not Do

- Does not assume any specific delivery date or SIH deadline commitment.
- Does not assume government infrastructure (NIC MeghRaj, live LRMS access) becomes available at any particular phase — Phase 5 items remain [FUTURE] until such access is actually confirmed.
- Does not claim the current prototype's 90% confidence threshold, or any other embedded constant, is validated — these are inherited defaults to be re-examined in Phase 2/4.

## 6. Open Questions

- Actual SIH submission/demo deadline and what subset of phases must be demoable by then — external constraint not present in the provided documentation.
- Whether a hosted government environment will be made available for a staging deployment during the SIH timeline, or whether all demonstration must run in a self-hosted/local environment.
