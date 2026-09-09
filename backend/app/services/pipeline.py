"""
Orchestrates: preprocess → layout → ocr ensemble → extraction (rule + VLM fusion) → validation
Keeps per-field bbox and confidence for frontend hover.
Heavy ML is OFF by default on laptop — VLM via free API instead.
"""
import asyncio
from app.core.config import ENABLE_VLM, VLM_PROVIDER, VLM_API_KEY, VLM_MODEL

async def run_pipeline(job_id: str, file_path: str, lang: str = "Marathi"):
    # 1. preprocess (light, OpenCV)
    # cleaned = preprocess.clean(file_path)

    # 2. layout + 3. light OCR + rule extraction (always runs, laptop-friendly)
    # rule_fields = extraction.rules.extract_all(ocr_text)  # survey/khata/area regex

    # 4. VLM API (free, no local GPU) — offloads handwriting/Devanagari to cloud
    vlm_fields = None
    if ENABLE_VLM and VLM_API_KEY:
        from app.services.vlm.providers import extract_via_vlm
        # cleaned or original image path
        vlm_fields = await extract_via_vlm(file_path, VLM_PROVIDER, VLM_API_KEY, VLM_MODEL)
        # vlm_fields = {surveyNo: {value, confidence}, ...}

    # 5. fusion: rule + vlm agreement → confidence ↑, else → low conf → verification
    # if vlm_fields:
    #   fields = fusion.fuse(rule_fields, vlm_fields)  # agreement required for surveyNo/ownerName
    # else:
    #   fields = rule_fields  # light fallback, low-conf fields → verification queue

    # 6. validation + persist + audit
    # score = validation.check(fields)
    # db.save(...)

    return {"job_id": job_id, "vlm_used": vlm_fields is not None}
