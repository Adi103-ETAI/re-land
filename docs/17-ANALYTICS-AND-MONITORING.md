# 17 — Analytics and Monitoring

> Related: [13-UI-UX-SPECIFICATION](./13-UI-UX-SPECIFICATION.md) · [12-INFORMATION-ARCHITECTURE](./12-INFORMATION-ARCHITECTURE.md) · [18-AI-EVALUATION-AND-CONTINUOUS-LEARNING](./18-AI-EVALUATION-AND-CONTINUOUS-LEARNING.md)
> Traces: REQ-ANALYTICS-001, REQ-ANALYTICS-002

## 1. Purpose

Defines the dashboard/analytics metric categories LANDLENS must surface, per the SIH requirement for interactive monitoring dashboards.

## 2. Metric Categories (source prompt §33)

### Operational
- Documents uploaded / processed
- Batches (count, status distribution)
- Processing time (per stage, per document)
- Failure rate
- Retry rate

### AI
- Extraction accuracy (against golden dataset — see [18-AI-EVALUATION-AND-CONTINUOUS-LEARNING](./18-AI-EVALUATION-AND-CONTINUOUS-LEARNING.md))
- Confidence distribution (extraction confidence histogram)
- OCR error patterns
- Field-level accuracy
- Model performance by `ModelVersion`

### Validation
- Validation pass rate
- Conflict rate (by check category — see [08-VALIDATION-AND-TRUST-ENGINE](./08-VALIDATION-AND-TRUST-ENGINE.md))
- Duplicate rate
- Most common validation failures

### Human Loop
- Pending verification count (queue depth)
- Average review time
- Corrections per field (which fields officers correct most — a strong signal for model improvement priority)
- Escalation rate
- Approval/rejection rate

### Geographic
- State-wise progress
- District-wise progress
- Tehsil/village progress, where available

## 3. Dashboard Requirements (REQ-ANALYTICS-001)

Interactive dashboards must display, at minimum: number of documents processed, extraction accuracy, validation status breakdown, pending verification cases, error statistics, and state/district-wise digitization progress — directly from the SIH problem statement's expected-solution list.

## 4. Persistence (REQ-ANALYTICS-002)

All metrics above are computed from persisted data (see [05-DATABASE-DESIGN](./05-DATABASE-DESIGN.md)), not held only in client memory — an officer/administrator returning to the dashboard after time away sees accurate, current figures, not a reset view.

## 5. Data Source Honesty

**[LLD]** Any chart currently backed by mock/sample numbers (as the existing prototype's dashboard/analytics pages currently are) must carry the same "Sample Data" labeling discipline as elsewhere (see [13-UI-UX-SPECIFICATION](./13-UI-UX-SPECIFICATION.md) §6) until wired to real aggregated data.

## 6. Technology

**[LLD]** Chart.js is already used in the current prototype and is retained for the Officer UI's embedded dashboards. The SIH documentation also suggests Power BI, Apache Superset, Plotly, and Grafana as broader analytics/visualization options — these are **[FUTURE]** considerations for a heavier BI layer (e.g. for department-level reporting beyond the officer-facing app), not a requirement for the core product's in-app dashboards.

## 7. Monitoring vs Analytics

This document also covers *operational monitoring* (is the pipeline healthy, are queues backing up, are retries spiking) as distinct from *product analytics* (accuracy, progress). **[LLD]** Operational monitoring (queue depth, worker health, error rates at the infrastructure level) is a production-readiness concern layered on top of the same underlying event/status data, typically surfaced via standard infrastructure monitoring tooling rather than the officer-facing dashboard.

## 8. Prototype vs Production

| | Prototype | Production |
|---|---|---|
| Dashboards | In-app Chart.js views over real (if limited) data | Same, potentially supplemented by a BI tool for department-level reporting |
| Monitoring | Basic logging/console visibility | Infrastructure-level monitoring/alerting (queue depth, error rate thresholds) |

## 9. Open Questions

- Whether department-level BI (Power BI/Superset) is actually needed for the SIH prototype phase or only for a later production rollout — not specified; treated as [FUTURE] here.
