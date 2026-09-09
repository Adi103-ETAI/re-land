import re
import unicodedata

# Gazette gazetteer for Pune villages — extend from LRMS
VILLAGES = {"Wagholi","Manjari","Chakan","Loni","Rajgurunagar","Haveli","Khed"}

def extract_survey_no(text: str) -> tuple[str, float] | None:
    m = re.search(r"\b\d{1,3}/\d{1,3}[A-Z]?\b", text)
    if m: return m.group(0), 0.97
    return None

def extract_khata(text: str) -> tuple[str, float] | None:
    m = re.search(r"\bKH[-\s]?\d{4,6}\b", text, re.I)
    if m:
        v = m.group(0).upper().replace(" ", "-").replace("KH-", "KH-")
        if "KH-" not in v: v = v.replace("KH", "KH-")
        return v, 0.95
    return None

def extract_area(text: str) -> tuple[str, float] | None:
    m = re.search(r"(\d+\.?\d*)\s*(hectare|ha|acre|guntha|आर|हेक्टर)", text, re.I)
    if m:
        val = float(m.group(1))
        unit = m.group(2).lower()
        # normalize to hectare
        if "acre" in unit: val *= 0.4047
        elif "guntha" in unit: val *= 0.0101
        return f"{val:.2f} Hectare", 0.92
    return None

def extract_owner(text: str) -> tuple[str, float] | None:
    # Devanagari name pattern: 2-3 words, may include transliteration
    # Fallback to ML NER in ml.py; rule is conservative
    m = re.search(r"[\u0900-\u097F]{3,}(?:\s+[\u0900-\u097F]{3,}){1,2}", text)
    if m:
        # transliterate via AI4Bharat in prod
        return m.group(0).strip(), 0.71  # low — always needs verification
    return None
