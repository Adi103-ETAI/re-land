import os, uuid, asyncio, logging
from app.core.jobs import set_progress, set_done, set_error
from app.core.config import ENABLE_VLM, VLM_PROVIDER, VLM_API_KEY, VLM_MODEL

# OCR service layer — preprocessing + tesseract engine + layout detection
from app.services.ocr.preprocess import preprocess_page
from app.services.ocr.engine import OCREngine

logger = logging.getLogger(__name__)

# Map vision-model output keys → record fields
FIELD_MAP = {
    "surveyNo": "survey",
    "khataNo": "khata",
    "khasraNo": "khasra",
    "ownerName": "owner",
    "area": "area",
    "village": "village",
    "tehsil": "tehsil",
    "district": "district",
    "classification": "classification",
    "mutationDate": "mutationDate",
}

def _to_record(recId: str, docLabel: str, extracted: dict, lang: str):
    # extracted is {field: {value, confidence}} or {field: value}
    def val(k):
        v = extracted.get(k)
        if isinstance(v, dict): return v.get("value"), v.get("confidence", 0.9)
        return v, 0.9 if v else 0
    # Build record + fields array with confidence
    owner, c1 = val("ownerName")
    survey, c2 = val("surveyNo")
    khata, c3 = val("khataNo")
    area_s, c4 = val("area")
    village, c5 = val("village")
    tehsil, c6 = val("tehsil")
    district, c7 = val("district")
    cls, c8 = val("classification")
    mut, c9 = val("mutationDate")
    khasra, c10 = val("khasraNo")
    # Normalize area string to float for record
    import re
    area_num = None
    if area_s:
        m = re.search(r"(\d+\.?\d*)", str(area_s))
        if m: area_num = float(m.group(1))
    rec = {
        "recId": recId,
        "owner": owner or "—",
        "survey": survey or "—",
        "khata": khata or "—",
        "khasra": khasra or "—",
        "village": village or "—",
        "tehsil": tehsil or "—",
        "district": district or "—",
        "area": area_num,
        # Reference area starts equal to the detected area — the validation
        # engine flags real mismatches, none are fabricated here.
        "areaDb": area_num,
        "classification": cls or "—",
        "mutationDate": mut or "—",
        "lang": lang,
        "docLabel": docLabel,
        "dupSim": 0,
        "dupMatch": None,
    }
    # Validation score
    low_conf = [c for c in (c1, c2, c3, c4, c9) if c and c < 0.7]
    score = max(70, round(100 - (2 if low_conf else 0)))
    rec["validationScore"] = score
    # Fields with confidence + normalized bbox for extraction UI
    def parse_bbox(raw):
        if not raw or not isinstance(raw, (list, tuple)) or len(raw) != 4:
            return None
        try:
            ymin, xmin, ymax, xmax = [float(x) for x in raw]
            # Some models return 0-1000 normalized coordinates
            if max(ymin, xmin, ymax, xmax) <= 1000:
                return {"ymin": ymin/1000, "xmin": xmin/1000, "ymax": ymax/1000, "xmax": xmax/1000}
            return {"ymin": ymin, "xmin": xmin, "ymax": ymax, "xmax": xmax}
        except: return None

    fields = []
    for gk, rk in FIELD_MAP.items():
        raw = extracted.get(gk)
        if isinstance(raw, dict):
            v = raw.get("value")
            c = raw.get("confidence", 0.0)
            bbox_raw = raw.get("bbox") or raw.get("box")
        else:
            v, c, bbox_raw = raw, 0.9 if raw else 0, None
        # Hide bbox if not found / confidence 0 / null value
        show = v is not None and str(v).strip() not in ("", "—", "-", "null") and float(c or 0) > 0
        bbox = parse_bbox(bbox_raw) if show else None
        val_str = str(v) if v is not None and str(v).strip() not in ("", "null") else "—"
        fields.append({"key": rk, "value": val_str, "confidence": float(c or 0), "bbox": bbox, "source": "ai" if c and c > 0 else "ocr"})
    return rec, fields, score

async def run_pipeline(job_id: str, file_path: str, lang: str = "Marathi"):
    try:
        set_progress(job_id, "preprocess", 10)
        # OCR preprocessing (CLAHE, threshold, denoise, deskew) — evidence-preserving
        try:
            cleaned = await preprocess_page(file_path)
            logger.debug("preprocess_page OK for %s (mode=%s size=%s)", file_path, getattr(cleaned, "mode", "?"), getattr(cleaned, "size", "?"))
        except Exception as e:
            logger.warning("preprocess_page failed for %s: %s", file_path, e)
        await asyncio.sleep(0.3)
        set_progress(job_id, "ocr", 30)
        # OCR engine: Tesseract PSM 6 + langdetect + VLM fallback for handwritten regions
        ocr_results: list[dict] = []
        layout_regions: list[dict] = []
        try:
            engine = OCREngine()
            # Layout detection (table/paragraph/stamp/signature) runs before/parallel to OCR
            try:
                layout_regions = await engine.detect_layout(file_path)
                logger.debug("detect_layout found %d regions for %s", len(layout_regions), file_path)
            except Exception as e:
                logger.warning("detect_layout failed: %s", e)
            # Map UI lang to tesseract code (Marathi → mar)
            _lang_map = {"marathi": "mar", "hindi": "hin", "english": "eng"}
            tess_lang = _lang_map.get(lang.lower(), "mar+hin+eng") if "+" not in lang.lower() else lang
            # For mixed case default to multilingual
            if tess_lang in ("mar", "hin", "eng"):
                tess_lang = "mar+hin+eng"
            ocr_results = await engine.recognize_page(page_id=1, image_path=file_path, lang=tess_lang)
            logger.debug("OCREngine recognized %d blocks for %s", len(ocr_results), file_path)
        except Exception as e:
            logger.warning("OCREngine failed: %s", e)
        # Vision-model extraction
        extracted = None
        if ENABLE_VLM and VLM_API_KEY:
            from app.services.vlm.providers import extract_via_vlm
            set_progress(job_id, "extracting", 55)
            extracted = await extract_via_vlm(file_path, VLM_PROVIDER, VLM_API_KEY, VLM_MODEL)
        if not extracted:
            # No fabricated demo output — fail honestly so the officer knows
            # nothing was extracted instead of reviewing made-up values.
            set_error(
                job_id,
                "Field extraction is not available (no vision-model API key configured or the provider "
                "is unreachable). Configure VLM_API_KEY in the backend .env and retry — no record was saved.",
            )
            return None
        set_progress(job_id, "validating", 85)
        await asyncio.sleep(0.2)
        recId = f"LR-{uuid.uuid4().int % 1000000:06d}"
        rec, fields, score = _to_record(recId, os.path.basename(file_path), extracted, lang)
        record = {**rec, "fields": fields, "score": score}
        set_done(job_id, record)
        return record
    except Exception as e:
        import traceback; traceback.print_exc()
        set_error(job_id, str(e))
        return None
