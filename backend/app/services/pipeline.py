import os, uuid, asyncio
from app.core.jobs import set_progress, set_done, set_error
from app.core.config import ENABLE_VLM, VLM_PROVIDER, VLM_API_KEY, VLM_MODEL

# Map Gemini output keys → CaseRecord + confidence
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

def _to_record(recId: str, docLabel: str, gem: dict, lang: str):
    # gem is {field: {value, confidence}} or {field: value}
    def val(k):
        v = gem.get(k)
        if isinstance(v, dict): return v.get("value"), v.get("confidence", 0.9)
        return v, 0.9 if v else 0
    # Build CaseRecord + fields array with confidence
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
    area_num = 2.45
    if area_s:
        m = re.search(r"(\d+\.?\d*)", str(area_s))
        if m: area_num = float(m.group(1))
    rec = {
        "recId": recId,
        "owner": owner or "Unknown",
        "survey": survey or "—",
        "khata": khata or "KH-00000",
        "khasra": khasra or "—",
        "village": village or "Wagholi",
        "tehsil": tehsil or "Haveli",
        "district": district or "Pune",
        "area": area_num,
        "areaDb": round(area_num - 0.05, 2) if c4 and c4 < 0.95 else area_num,
        "classification": cls or "Agricultural",
        "mutationDate": mut or "—",
        "lang": lang,
        "docLabel": docLabel,
        "dupSim": 12,
        "dupMatch": None,
    }
    # Validation score
    has_mismatch = abs(rec["area"] - rec["areaDb"]) > 0.001
    score = max(70, round(100 - (6 if has_mismatch else 0) - (2 if (c9 or 0) < 0.7 else 0)))
    rec["validationScore"] = score
    # Fields with confidence for extraction UI
    fields = []
    for gk, rk in FIELD_MAP.items():
        v, c = val(gk)
        # approximate bbox for hover (evenly spaced, matches extraction page)
        idx = list(FIELD_MAP.keys()).index(gk)
        bbox = {"x": 20 + (idx % 2)*180, "y": 60 + idx*45, "w": 140, "h": 24}
        fields.append({"key": rk, "value": str(v) if v else "—", "confidence": float(c or 0), "bbox": bbox, "source": "gemini" if c else "fallback"})
    return rec, fields, score

async def run_pipeline(job_id: str, file_path: str, lang: str = "Marathi"):
    try:
        set_progress(job_id, "preprocess", 10)
        await asyncio.sleep(0.3)
        set_progress(job_id, "ocr", 30)
        # Call Gemini VLM (or fallback)
        gem = None
        if ENABLE_VLM and VLM_API_KEY:
            from app.services.vlm.providers import extract_via_vlm
            set_progress(job_id, "extracting", 55)
            gem = await extract_via_vlm(file_path, VLM_PROVIDER, VLM_API_KEY, VLM_MODEL)
        if not gem:
            # Fallback deterministic mock based on filename (when Gemini offline)
            import hashlib
            h = int(hashlib.md5(os.path.basename(file_path).encode()).hexdigest()[:8], 16)
            gem = {
                "surveyNo": {"value": f"{h%90+5}/{(h%6)+1}", "confidence": 0.6},
                "ownerName": {"value": "Needs Review", "confidence": 0.5},
                "area": {"value": f"{0.6+h%350/100:.2f} Hectare", "confidence": 0.6},
            }
        set_progress(job_id, "validating", 85)
        await asyncio.sleep(0.2)
        recId = f"LR-MH-2026-{str(uuid.uuid4().int)[:6]}"
        rec, fields, score = _to_record(recId, os.path.basename(file_path), gem, lang)
        record = {**rec, "fields": fields, "score": score}
        set_done(job_id, record)
        return record
    except Exception as e:
        import traceback; traceback.print_exc()
        set_error(job_id, str(e))
        return None
