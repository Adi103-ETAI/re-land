"""Extraction runner — OCR blocks → structured CaseRecord fields.

Deterministic rule layer (see rules.py) applied line-by-line over the OCR
word blocks. Each field keeps the bbox of the OCR line it was found on so the
frontend can overlay it on the ORIGINAL scanned image (coords normalized 0-1
in {ymin, xmin, ymax, xmax} order).
"""
from __future__ import annotations

import logging
import re
from typing import Any

from app.services.extraction.rules import extract_area, extract_khata, extract_survey_no

logger = logging.getLogger(__name__)

VILLAGES = {"Wagholi", "Manjari", "Chakan", "Loni", "Rajgurunagar", "Haveli", "Khed", "Uruli"}
TEHSILS = {"Haveli", "Khed", "Maval", "Mulshi", "Baramati", "Indapur"}
DISTRICTS = {"Pune", "Satara", "Nashik", "Nagpur", "Ahmednagar"}

DEVANAGARI = re.compile(r"[\u0900-\u097F]")
DATE_RE = re.compile(r"\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b")
CLASSIFICATION_KEYWORDS = [
    ("Agricultural", ["sheti", "शेती", "agricultur", "krushi", "कृषी"]),
    ("Residential", ["nivasi", "निवासी", "resident", "ghar", "घर"]),
    ("Commercial", ["vyapar", "व्यापार", "commercial", "dukan", "दुकान"]),
    ("Forest", ["forest", "वन", "jungle", "aran", "आरण"]),
    ("Grazing", ["charai", "चराई", "grazing", "gairat"]),
]

FIELD_ORDER = ["owner", "survey", "khata", "khasra", "village", "tehsil", "district", "area", "classification", "mutationDate"]


def _norm_bbox(bbox: list[int], size: tuple[int, int]) -> dict[str, float]:
    """Pixel [x, y, w, h] → normalized {ymin, xmin, ymax, xmax} (0-1)."""
    w, h = size
    x, y, bw, bh = bbox
    return {
        "ymin": round(max(0.0, y / h), 4),
        "xmin": round(max(0.0, x / w), 4),
        "ymax": round(min(1.0, (y + bh) / h), 4),
        "xmax": round(min(1.0, (x + bw) / w), 4),
    }


def group_lines(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Cluster word blocks into visual lines (rows) by vertical center."""
    if not blocks:
        return []
    items = sorted(blocks, key=lambda b: (b["bbox"][1] + b["bbox"][3] / 2, b["bbox"][0]))
    lines: list[dict[str, Any]] = []
    current: list[dict[str, Any]] = []
    cur_center = None
    for b in items:
        x, y, w, h = b["bbox"]
        center = y + h / 2
        if current and cur_center is not None and abs(center - cur_center) > max(h, 14) * 0.75:
            lines.append(current)
            current = []
            cur_center = None
        current.append(b)
        cur_center = center if cur_center is None else (cur_center + center) / 2
    if current:
        lines.append(current)

    out: list[dict[str, Any]] = []
    for line in lines:
        line = sorted(line, key=lambda b: b["bbox"][0])
        x0 = min(b["bbox"][0] for b in line)
        y0 = min(b["bbox"][1] for b in line)
        x1 = max(b["bbox"][0] + b["bbox"][2] for b in line)
        y1 = max(b["bbox"][1] + b["bbox"][3] for b in line)
        conf = sum(b["confidence"] for b in line) / len(line)
        out.append({
            "text": " ".join(b["text"] for b in line),
            "bbox": [int(x0), int(y0), int(x1 - x0), int(y1 - y0)],
            "confidence": conf,
            "blocks": line,
        })
    return out


def _mk(key: str, value: str, confidence: float, bbox_norm: dict | None, source: str = "rule") -> dict[str, Any]:
    conf = max(0.0, min(1.0, confidence))
    return {"key": key, "value": value, "confidence": round(conf, 3), "bbox": bbox_norm, "source": source, "_block": None}


def _rule_value(rule_fn, line_text: str, line: dict, size: tuple[int, int], base: float) -> dict[str, Any] | None:
    res = rule_fn(line_text)
    if not res:
        return None
    value, rule_conf = res
    conf = base * rule_conf * (line["confidence"] / 100.0 if line["confidence"] > 1 else line["confidence"])
    return _mk("", value, conf, _norm_bbox(line["bbox"], size))


def _english_owner(line_text: str) -> str | None:
    m = re.search(r"\b(?:Shri|Smt|Mr\.?|Mrs\.?)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,2})", line_text)
    if m:
        return m.group(0).replace("Mr.", "Shri").replace("Mrs.", "Smt").strip()
    # bare name line: 2-3 TitleCase words, no digits, short line
    words = line_text.strip().split()
    if 2 <= len(words) <= 3 and all(re.fullmatch(r"[A-Z][a-zA-Z]{2,}", w) for w in words):
        return line_text.strip()
    return None


def classify_document(full_text: str) -> str:
    low = full_text.lower()
    if "7/12" in low or "saatbara" in low or "सातबार" in low:
        return "7/12 Extract"
    if "mutation entry" in low or "फेरफार" in low:
        return "Mutation Entry"
    if "property card" in low or "प्रॉपर्टी" in low:
        return "Property Card"
    if "register" in low:
        return "7/12 Extract"
    return "Land Record"


def detect_language(full_text: str, fallback: str = "Marathi") -> str:
    return "Marathi" if DEVANAGARI.search(full_text) else ("English" if full_text.strip() else fallback)


def build_record(
    blocks: list[dict[str, Any]],
    size: tuple[int, int],
    lang_hint: str = "Marathi",
) -> dict[str, Any]:
    """Return {fields, record, ocr_lines} ready for persistence + the jobs store."""
    lines = group_lines(blocks)
    for ln in lines:
        ln["norm"] = _norm_bbox(ln["bbox"], size)
    full_text = "\n".join(ln["text"] for ln in lines)

    fields: dict[str, dict[str, Any]] = {}

    def put(key: str, candidate: dict[str, Any]) -> None:
        candidate["key"] = key
        existing = fields.get(key)
        if existing is None or candidate["confidence"] > existing["confidence"]:
            fields[key] = candidate

    for ln in lines:
        text = ln["text"]

        survey = _rule_value(extract_survey_no, text, ln, size, 0.99)
        if survey:
            put("survey", survey)

        khata = _rule_value(extract_khata, text, ln, size, 0.97)
        if khata:
            put("khata", khata)

        area = _rule_value(extract_area, text, ln, size, 0.95)
        if area:
            put("area", area)

        m = DATE_RE.search(text)
        if m and "mutationDate" not in fields:
            dd, mm, yy = m.groups()
            year = int(yy)
            if year < 100:
                year += 2000 if year < 50 else 1900
            try:
                conf = 0.85 * (ln["confidence"] / 100.0 if ln["confidence"] > 1 else ln["confidence"])
                put("mutationDate", _mk("mutationDate", f"{year:04d}-{int(mm):02d}-{int(dd):02d}", conf, _norm_bbox(ln["bbox"], size)))
            except ValueError:
                pass

        owner_dev = re.search(r"[\u0900-\u097F]{3,}(?:\s+[\u0900-\u097F]{3,}){1,2}", text)
        if owner_dev and "owner" not in fields:
            put("owner", _mk("owner", owner_dev.group(0).strip(), 0.71, _norm_bbox(ln["bbox"], size)))
        elif "owner" not in fields or fields["owner"]["confidence"] < 0.6:
            eng = _english_owner(text)
            if eng:
                conf = 0.78 * (ln["confidence"] / 100.0 if ln["confidence"] > 1 else ln["confidence"])
                cand = _mk("owner", eng, conf, _norm_bbox(ln["bbox"], size))
                existing = fields.get("owner")
                if existing is None or cand["confidence"] > existing["confidence"]:
                    fields["owner"] = cand

        low = text.lower()
        for village in VILLAGES:
            if village.lower() in low:
                conf = 0.9 * (ln["confidence"] / 100.0 if ln["confidence"] > 1 else ln["confidence"])
                put("village", _mk("village", village, conf, _norm_bbox(ln["bbox"], size)))
        for tehsil in TEHSILS:
            if tehsil.lower() in low:
                put("tehsil", _mk("tehsil", tehsil, 0.88, _norm_bbox(ln["bbox"], size)))
        for district in DISTRICTS:
            if district.lower() in low:
                put("district", _mk("district", district, 0.9, _norm_bbox(ln["bbox"], size)))

        for label, keywords in CLASSIFICATION_KEYWORDS:
            if any(k in low for k in keywords):
                put("classification", _mk("classification", label, 0.86, _norm_bbox(ln["bbox"], size)))
                break

        # khasra: standalone 2-5 digit number on its own short line
        if "khasra" not in fields:
            m = re.fullmatch(r"\s*(\d{2,5})\s*", text)
            if m:
                conf = 0.6 * (ln["confidence"] / 100.0 if ln["confidence"] > 1 else ln["confidence"])
                put("khasra", _mk("khasra", m.group(1), conf, _norm_bbox(ln["bbox"], size)))

    # Defaults — never block the flow on a missing field
    defaults = [
        ("owner", "—", 0.0), ("survey", "—", 0.0), ("khata", "—", 0.0), ("khasra", "—", 0.0),
        ("village", "—", 0.0), ("tehsil", "Haveli", 0.35), ("district", "Pune", 0.4),
        ("area", "—", 0.0), ("classification", "Agricultural", 0.45), ("mutationDate", "—", 0.0),
    ]
    for key, value, conf in defaults:
        if key not in fields:
            fields[key] = _mk(key, value, conf, None, source="inferred")

    # Structure the area: numeric hectares + display value
    area_num = 0.0
    if fields["area"]["value"] not in ("—", ""):
        try:
            area_num = float(re.findall(r"\d+\.?\d*", fields["area"]["value"])[0])
            fields["area"]["value"] = f"{area_num:.2f} Hectare"
        except (IndexError, ValueError):
            area_num = 0.0

    ordered = [fields[k] for k in FIELD_ORDER if k in fields]
    record = {
        "owner": fields["owner"]["value"],
        "survey": fields["survey"]["value"],
        "khata": fields["khata"]["value"],
        "village": fields["village"]["value"],
        "tehsil": fields["tehsil"]["value"],
        "district": fields["district"]["value"],
        "area": area_num,
        "areaDb": area_num,
        "classification": fields["classification"]["value"],
        "mutationDate": fields["mutationDate"]["value"],
        "lang": detect_language(full_text, lang_hint),
        "docLabel": classify_document(full_text),
        "validationScore": 0,
        "dupSim": 0,
        "dupMatch": None,
    }
    return {"fields": ordered, "record": record, "ocr_lines": lines}
