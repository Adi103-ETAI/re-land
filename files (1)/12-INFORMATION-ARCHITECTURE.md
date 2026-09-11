# 12 — Information Architecture

> Related: [13-UI-UX-SPECIFICATION](./13-UI-UX-SPECIFICATION.md) · [04-ROLES-AND-RBAC](./04-ROLES-AND-RBAC.md)
> Traces: REQ-ANALYTICS-002, REQ-HUMAN-002

## 1. Purpose

Defines the navigation structure of the Officer UI, organized around user tasks rather than mirroring the current prototype's ten pages one-for-one (source prompt §34 explicitly warns against just copying the existing pages).

## 2. Proposed Navigation

```text
Dashboard

Batches
 ├── All Batches
 ├── Create Batch
 └── Batch Details

Documents
 ├── All Documents
 ├── Processing
 ├── Failed / Retry
 └── Document Details

Records
 ├── All Records
 ├── Needs Review
 ├── Approved
 └── Rejected

Verification
 ├── My Queue
 ├── Escalated
 └── Completed

GIS

Analytics

Audit

Integrations

Administration
```

**[LLD]** This is a proposed information architecture, explicitly subject to refinement by dedicated UX research/testing — not asserted as final (per source prompt §34).

## 3. Section-to-Requirement Mapping

| Section | Primary user | Primary requirement(s) served |
|---|---|---|
| Dashboard | All roles (scoped view) | REQ-ANALYTICS-001, REQ-ANALYTICS-002 |
| Batches | Digitization Officer | REQ-DOC-001, REQ-AI-002 |
| Documents | Digitization Officer | REQ-DOC-004, REQ-AI-003 |
| Records | Verification Officer, Auditor | REQ-REC-001 |
| Verification | Verification Officer, Senior Officer | REQ-HUMAN-001 – 004 |
| GIS | Verification Officer, Analyst | REQ-GIS-001 |
| Analytics | Senior Officer, Admin | REQ-ANALYTICS-001 |
| Audit | Auditor | REQ-AUDIT-001 |
| Integrations | Admin | REQ-API-001 |
| Administration | Admin | REQ-RBAC-001 |

## 4. Task-Oriented Rationale (vs. the current 10 pages)

The current prototype's pages (Dashboard, Upload, Processing, Extraction, Validation, Verification, Record, GIS, Analytics, Audit) map roughly one-to-one to *pipeline stages*. This IA instead organizes around **what the officer is trying to do**:
- "See what needs my attention" → Verification (My Queue)
- "Check on a batch I submitted" → Batches → Batch Details
- "Investigate a specific record" → Records
- "Understand overall progress" → Dashboard / Analytics

Pipeline-stage visibility (e.g. "which stage is document X stuck at") still exists, but nested under **Documents → Processing / Failed-Retry**, rather than being the top-level navigation metaphor.

## 5. Persistence Across Navigation (REQ-ANALYTICS-002)

Every list/queue view (Batch Details, My Queue, Failed/Retry) must reflect **persisted server state**, not client-only state — an officer can close the browser and return later to find batch progress and queue contents exactly where they left off. This directly follows from REQ-AI-002/REQ-ANALYTICS-002 and rules out any purely client-side (e.g. Zustand-only, as in the current prototype) source of truth for this data.

## 6. Prototype vs Production

- **Prototype:** may implement a subset of this IA fully (e.g. Batches, Documents, Verification, Dashboard) and stub the rest (Integrations, full Administration) as long as stubs are clearly labeled, not silently non-functional.
- **Production:** full IA implemented, with role-based navigation filtering (an Auditor doesn't see "Create Batch," for instance).

## 7. Open Questions

- Whether "Records" should be merged into "Verification" for smaller deployments (single-officer teams) — left as a future UX consideration, not decided here.
