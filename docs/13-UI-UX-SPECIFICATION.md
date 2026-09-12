# 13 — UI/UX Specification

> Related: [12-INFORMATION-ARCHITECTURE](./12-INFORMATION-ARCHITECTURE.md) · [09-HUMAN-VERIFICATION](./09-HUMAN-VERIFICATION.md) · [17-ANALYTICS-AND-MONITORING](./17-ANALYTICS-AND-MONITORING.md)
> Traces: REQ-HUMAN-002, REQ-ANALYTICS-002

## 1. Purpose

Defines UI/UX principles, key screens, and error-handling behavior for the Officer UI. Screens described here are user-task specifications, not visual mockups.

## 2. Design Principles (source prompt §35)

The interface serves government officers handling potentially large volumes of information. Priorities, in order of emphasis:
1. **Clarity** over density — status and next action should be obvious at a glance.
2. **Low cognitive load** — minimize what the officer must hold in their head.
3. **Efficient bulk operations** — batch-level actions where individual-record actions would be tedious.
4. **Status visibility** — processing/queue state always visible, never hidden behind a refresh.
5. **Evidence-based verification** — see §3 below.
6. **Minimal unnecessary data entry** — never ask an officer to retype what the AI already extracted; only correct it.
7. **Accessibility** — legible at typical government-office screen/print conditions; not dependent on color alone for status meaning.
8. **Clear errors** — see §5.
9. **Clear confidence indicators** — extraction confidence and trust/validation status shown distinctly (per [08-VALIDATION-AND-TRUST-ENGINE](./08-VALIDATION-AND-TRUST-ENGINE.md)), not merged into one generic badge.
10. **Easy retry** — a failed stage should have an obvious, one-click retry path.
11. **Traceability** — every value on screen should be one click from its source evidence.

## 3. Key Screen: Verification Task

The single most important screen in the product. Layout priority (source prompt §35):

```text
Source evidence  +  AI extraction  +  Confidence  +  Validation conflict  +  Correction
```

Not a large form requiring full manual re-entry. See [09-HUMAN-VERIFICATION](./09-HUMAN-VERIFICATION.md) §4 for the full content list. Interaction pattern:
- Officer hovers/clicks a field → corresponding bounding box highlights on the source image.
- Each field shows: AI value, extraction confidence (visual indicator, e.g. a meter, not just a color dot), validation status (pass/conflict/warning) with the conflicting source named.
- Correction is inline (edit the field directly), not a separate re-entry form.
- Action buttons: Accept / Correct & Continue / Reject / Request Reprocessing / Escalate — always visible, not buried in a menu.

## 4. Key Screen: Batch Dashboard

Persistent, real-time-ish view of a batch's progress (source prompt §25 example, illustrative numbers only):

```text
BATCH #2026-09-001
Total Documents        1,000
Records Detected      12,438
Processing                82%

Completed                 812
Processing                 96
Needs Retry                14
Failed                      8
Human Review              108
Auto Approved           11,412
```

Must remain accurate after the officer navigates away and returns (REQ-ANALYTICS-002) — sourced from persisted `ProcessingStage`/`ExtractedRecord` state, not client memory.

## 5. Error Handling (source prompt §36)

**[LLD]** Failures are always visible and actionable — never silently replaced with sample/demo data. Example pattern:

```text
OCR failed
Reason: Image quality insufficient
Actions: [Retry]  [Try alternate OCR]  [Send for manual review]
```

This directly addresses a gap noted in the current codebase, where a fetch failure on the processing page silently falls back to showing sample data (`processing/page.tsx`) — that behavior is explicitly disallowed going forward.

## 6. Confidence & Status Visual Language (concept, not final visual design)

- Extraction confidence: numeric/graded indicator (e.g. High/Medium/Low bands with the underlying percentage available on demand).
- Validation/trust status: separate indicator — Pass / Conflict / Needs Review — never merged visually with extraction confidence, per REQ-VAL-005.
- Demo/sample data: any screen showing non-real data must carry a persistent, unmissable label (the current prototype's "Sample Data — Not an Official Land Record" disclaimer is a good existing pattern worth keeping).

## 7. Bulk Operations

Where an officer needs to act on many items at once (e.g. retry all failed OCR in a batch, bulk-assign a queue), the UI provides explicit bulk-select and bulk-action affordances rather than requiring repetition of single-item actions.

## 8. Accessibility Notes

- Sufficient color contrast; status never conveyed by color alone (pair with icon/text label).
- Keyboard navigability for verification screens (officers processing high volumes benefit from keyboard shortcuts for Accept/Correct/Next).
- Legible at common office display resolutions; source-document zoom must support fine detail inspection of handwriting.

## 9. Prototype vs Production

- **Prototype:** existing Next.js/React/Tailwind stack, Chart.js for dashboards, Leaflet for GIS — retained (see [10-SYSTEM-ARCHITECTURE](./10-SYSTEM-ARCHITECTURE.md)); screens may cover a subset of the full IA.
- **Production:** full accessibility audit, offline-tile handling for GIS (current CDN-dependent Leaflet setup needs offline fallback per the codebase audit), performance tuning for very large batches.

## 10. Open Questions

- Formal accessibility compliance target (e.g. WCAG level) for a government deployment — not specified by SIH docs; recommend adopting WCAG 2.1 AA as a reasonable default pending government guidance.
