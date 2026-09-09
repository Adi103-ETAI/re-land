# LANDLENS Backend — Careful Extraction Plan

> Goal: From a faded 1962 register / mutation entry → trusted JSON `{ownerName, surveyNo, khataNo, khasraNo, area, village, tehsil, district, classification, mutationDate}` with per-field confidence + bbox for `extraction/page.tsx` hover. Error tolerance on `surveyNo/area/ownerName` must be near-zero → low confidence **always** routes to `verification`.

## 1. Why old files are hard (from `original.html:10-11` → `src/lib/ocr.ts:10`)

| Problem | Example in Pune records | Mitigation |
|---|---|---|
| Faded ink + paper texture `EFEAD9` | 1962 register, low contrast | Adaptive threshold + super-res (Real-ESRGAN) before OCR |
| Handwriting (Devanagari + English) | `Suresh Kadu → Kadam` 71% `validation:849` | TrOCR-handwritten + PaddleOCR, not Tesseract alone |
| Skew + warped pages | Scanned register not flat | Hough deskew + dewarp |
| Stamps / signatures overlap | Revenue stamp on survey col | Layout segmentation → mask stamps |
| Multilingual same page | Marathi body + English survey `42/3` | `mar+hin+eng` ensemble + language detection per block |
| Table structure | 7/12 register is a table | LayoutLMv3 table detection → column = field |

## 2. Pipeline (each doc → `CaseRecord` in `src/lib/types.ts:1`)

```
Upload (PDF/JPG/TIFF) 
  → 1 Preprocess (OpenCV) 
  → 2 Layout (detect tables/text blocks + bboxes)
  → 3 OCR Ensemble (per-block, keeps bbox + confidence)
  → 4 Extraction (rule + ML → structured fields + confidence)
  → 5 Validation (LRMS/cadastral + cross-field checks → score 0-100)
  → 6 Decision (≥90% auto-verify, else → verification queue)
  → Postgres + S3 (original + cleaned image) + Audit trail
```

### Stage 1 — Preprocess `backend/app/services/preprocess/`
- Grayscale → CLAHE contrast → adaptive Gaussian threshold → denoise (fastNlMeans) → deskew (minAreaRect) → DPI normalize 300dpi.
- Output: `cleaned.png` + `debug/preprocess.jpg`. Keep original for audit.

### Stage 2 — Layout `backend/app/services/layout/`
- Model: `LayoutParser` (Paddle) or `microsoft/layoutlmv3-base` fine-tuned on 50 annotated registers.
- Detect: `table`, `handwritten_row`, `printed_header`, `stamp`, `signature`.
- Returns bboxes with `block_id` — critical for `bbox[data-f]` hover in `extraction/page.tsx:298`.

### Stage 3 — OCR Ensemble `backend/app/services/ocr/`
- Printed blocks → `tesseract 5.4` (`mar+hin+eng`, `oem 1`, `psm 6` for tables).
- Handwritten blocks → `PaddleOCR` (Devanagari) + `microsoft/trocr-large-handwritten` fallback.
- Optional VL fallback for very degraded: `Qwen2-VL-2B` / `Donut` (prompt: "read this land record table row").
- Per-word confidence kept. Language per block via `langdetect`. Ensemble vote → final text + `confidence` (mean of word conf).

### Stage 4 — Extraction (THE careful step) `backend/app/services/extraction/`
Two layers, both must agree:

**A. Rule layer (deterministic, high precision):**
```
surveyNo: /\b\d{1,3}\/\d{1,3}[A-Z]?\b/  (table column 2)
khataNo:  /\bKH[-\s]?\d{4,6}\b/i → normalize KH-89342
khasraNo: /\b\d{2,5}\b/ (if separate)
area:     /(\d+\.?\d*)\s*(hectare|ha|acre|guntha|आर)/i → normalize to Hectare (1 acre=0.4047ha, 1 guntha=0.0101ha)
mutationDate: /\b\d{1,2}[\/\- ]\d{1,2}[\/\- ]\d{2,4}|\b\d{1,2} (Jan|Feb|…|Aug|…)/i → ISO
village/tehsil/district: Gazetteer lookup (Pune villages: Wagholi, Manjari…) + NER (IndicNER)
ownerName:  Devanagari NER → transliterate (AI4Bharat) → match voter DB fuzzy (Levenshtein ≤2)
classification: keywords {Agricultural: शेती, Residential: निवासी…}
```
Each rule returns `{value, confidence: ruleScore * ocrConf, bbox}`.

**B. ML layer (recall, handles handwriting noise):**
- Fine-tuned `LayoutLMv3` / `Donut` on golden samples → direct JSON `{surveyNo, khataNo, …}` with token-level confidence.
- Or LLM structuring: prompt Qwen-VL with OCR text + layout → `{"surveyNo": {"value": "42/3", "confidence": 0.96}}`. Use function-calling schema.

**Fusion:** If rule and ML agree → confidence ↑ (0.98). If disagree → confidence ↓ and flag `needs_review` (shown as `conf-mid/low` in `extraction/page.tsx:790`). Survey/area/owner disagreement **always** → `verification` (never auto).

### Stage 5 — Validation `backend/app/services/validation/`
- LRMS lookup by `surveyNo+village`, cadastral DB check, duplicate search (`owner+village+survey` → `dupSim`).
- Cross-field: `Haveli tehsil` must contain `Wagholi village` (gazetteer), area must be >0 and <500ha.
- Score: `100 - 6*areaMismatch -4*duplicate -2*lowConfField` (same as `extraction:793` logic, now computed server-side).

## 3. Backend Structure

```
backend/
  app/
    main.py                 # FastAPI, CORS for Next.js
    core/
      config.py             # env, thresholds (CONF_THRESHOLD=0.90)
      logging.py
      storage.py            # S3/MinIO for original+cleaned
    api/v1/
      upload.py             # POST /api/v1/records/upload (multipart, returns jobId)
      jobs.py               # GET  /api/v1/jobs/{jobId} (poll status, SSE)
      records.py            # GET  /api/v1/records/{recId} → CaseRecord + bboxes
      validate.py           # POST /api/v1/records/{id}/validate
      verify.py             # POST /api/v1/verify/{id} {decision, officerValue}
    services/
      preprocess/clean.py
      layout/detect.py
      ocr/ensemble.py       # tesseract + paddle + trocr
      extraction/
        rules.py            # regex + gazetteer
        ml.py               # LayoutLM/Donut/LLM
        fusion.py           # rule+ml agreement
      validation/check.py
      pipeline.py           # orchestrates 1→5, writes audit
    models/
      record.py             # SQLAlchemy/Pydantic
      audit.py
    schemas/
      record.py             # CaseRecord + FieldWithConfidence {value, confidence, bbox, source}
    db/
      base.py, session.py
  data/
    golden_samples/         # 50-100 annotated old scans (7/12, mutation, cadastral) — THE accuracy baseline
    annotations/labels.json # {file, fields: {surveyNo: {value, bbox}}}
  scripts/
    annotate.py             # helper to create labels
    evaluate.py             # field-level F1 / CER per field
    finetune_layoutlm.py
  tests/
    test_extraction.py      # golden set must pass
  requirements.txt
  Dockerfile
  .env.example

src/app/api/                # Next.js BFF (proxy, no ML deps in frontend)
  records/route.ts          # forwards to FastAPI, adds auth
  upload/route.ts
```

## 4. API Contracts (Next.js ↔ FastAPI)

```
POST /api/v1/records/upload
  body: multipart {file, lang: "Marathi", options: {detectHandwriting: true}}
  → {jobId: "job_abc", status: "queued"}

GET /api/v1/jobs/{jobId}  (poll or SSE)
  → {status: "ocr"|"extracting"|"done", progress: 72, currentCase?: CaseRecord, fields: Field[]}

GET /api/v1/records/{recId}
  → CaseRecord + fields: [{key:"surveyNo", value:"42/3", confidence:0.96, bbox:{x,y,w,h}, source:"rule+ml"}]
      Frontend uses bbox for hover (replaces hardcoded bboxes:298) and confidence for bar color:793

POST /api/v1/records/{id}/verify {decision:"Approved", officerValue:"42/3"}
  → audit event + updates store
```

## 5. DB Schema (Postgres)

```sql
records(id, rec_id, owner, survey_no, khata_no, area, area_db, classification, mutation_date, village, tehsil, district, lang, doc_label, confidence_json, bboxes_json, validation_score, status, created_at)
fields(record_id, key, value, confidence, bbox, source) -- per-field audit
jobs(id, status, progress, error)
audit_events(record_id, time, title, desc, meta, user_id)
files(record_id, original_url, cleaned_url)
```

## 6. Careful Extraction Guarantees

- No field with `confidence <0.90` auto-verifies — always `verification` (matches `processing:2` → `verification:5` in workflow).
- `surveyNo`/`khataNo`/`ownerName` require **both** rule+ML agreement or human review.
- Golden set evaluation: `scripts/evaluate.py` reports per-field precision/recall. Target: `surveyNo 98%`, `ownerName 95%` (fuzzy), `area 97%`. Build fails if regresses.
- Bbox preserved end-to-end → officer can always see *where* value came from (trust).
- All corrections logged to `audit` (immutable) — `audit/page.tsx:1075` reads from DB, not mock.

## 7. Phased Implementation

Phase 1 (Week 1): Scaffold FastAPI + upload + preprocess + tesseract (printed) + rule extraction → covers 60% clean scans.
Phase 2 (Week 2): Add PaddleOCR + layout detection + bbox → handwriting + table support.
Phase 3 (Week 3): Collect 50 golden samples → fine-tune LayoutLM/Donut → fusion → validation service + duplicate check.
Phase 4 (Week 4): Human-in-loop (verification queue DB), audit, storage, Next.js BFF wiring, evaluate harness.

## 8. Next Step Choice

Option A: Keep extraction fully in Next.js (no Python) — faster but 20-30% less accurate on handwriting.
Option B (recommended): FastAPI Python service + Next.js proxy — required for Paddle/TrOCR/LayoutLM.

Tell me `FastAPI + Postgres` vs `Next.js-only` and I scaffold the chosen skeleton immediately.
