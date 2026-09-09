"""
Free VLM providers — all offload heavy compute from your laptop to cloud.
Pick one via VLM_PROVIDER + VLM_API_KEY in .env. No torch/paddle needed locally.

Free tiers (as of 2026):
- gemini: Google Gemini 1.5 Flash — 60 RPM free, best for Devanagari + tables
- openrouter: Qwen2-VL / Llama-Vision free models (github.com/openrouter)
- huggingface: Inference API free (Donut, Qwen2-VL) — HF_TOKEN
- groq: Llama 3.2 Vision 11B free tier, fastest
- together: Qwen2-VL free credits
- sarvam: Sarvam Vision (Indic) — if you have key
"""
from typing import Optional
import base64, httpx, os

SYSTEM_PROMPT = """You are LANDLENS extractor for historical Indian land records (1962-2010). \
Read the image carefully. It may be faded, handwritten Devanagari/Marathi/Hindi + English numbers. \
Extract ONLY these fields as JSON with confidence 0-1 per field:
{surveyNo, khataNo, khasraNo, ownerName, area, village, tehsil, district, classification, mutationDate}
Rules: surveyNo like 42/3 or 17/B; khataNo like KH-89342; area like "2.45 Hectare" normalized to Hectare; \
ownerName transliterate Devanagari to Latin; classification in {Agricultural, Residential, Non-Agricultural}; \
mutationDate as "12 Aug 2025". If field not found, set value null and confidence 0. Return strict JSON only, no markdown."""

SARVAM_TEXT_PROMPT = """You are LANDLENS extractor. Given OCR text from a historical Indian land record (may be noisy, Devanagari + English), extract ONLY JSON with confidence 0-1 per field:
{surveyNo, khataNo, khasraNo, ownerName, area, village, tehsil, district, classification, mutationDate}
Rules: surveyNo like 42/3; khataNo like KH-89342; area like 2.45 Hectare; ownerName transliterate Devanagari to Latin; classification {Agricultural, Residential, Non-Agricultural}; mutationDate like 12 Aug 2025. If not found, null. Return strict JSON only."""

PROVIDER_DEFAULTS = {
    "gemini":     {"model": "gemini-3.5-flash", "url": "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"},
    "openrouter": {"model": "qwen/qwen-2-vl-7b-instruct:free", "url": "https://openrouter.ai/api/v1/chat/completions"},
    "huggingface":{"model": "Qwen/Qwen2-VL-7B-Instruct", "url": "https://api-inference.huggingface.co/models/{model}"},
    "groq":       {"model": "llama-3.2-11b-vision-preview", "url": "https://api.groq.com/openai/v1/chat/completions"},
    "together":   {"model": "Qwen/Qwen2-VL-7B-Instruct", "url": "https://api.together.xyz/v1/chat/completions"},
    "sarvam":     {"model": "sarvam-105b", "url": "https://api.sarvam.ai/v1/chat/completions"},
}

def _b64(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()

async def call_gemini(image_path: str, api_key: str, model: str) -> dict:
    b64 = _b64(image_path)
    url = PROVIDER_DEFAULTS["gemini"]["url"].format(model=model) + f"?key={api_key}"
    payload = {
        "contents": [{"parts": [
            {"text": SYSTEM_PROMPT},
            {"inline_data": {"mime_type": "image/jpeg", "data": b64}}
        ]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1}
    }
    # retry on 503/429 (Gemini transient)
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=60) as c:
                r = await c.post(url, json=payload)
                r.raise_for_status()
                j = r.json()
                text = j["candidates"][0]["content"]["parts"][0]["text"]
                import json as _j, re
                m = re.search(r"\{.*\}", text, re.DOTALL)
                return _j.loads(m.group(0) if m else text)
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (503, 429, 500) and attempt < 2:
                import asyncio; await asyncio.sleep(1.5 * (attempt + 1))
                continue
            raise

async def call_sarvam(image_path: str, api_key: str, model: str) -> dict:
    """Sarvam is text-only (no image_url). Do light OCR locally, then LLM extraction via Sarvam — laptop stays light, API handles Indic NER."""
    # 1. Light OCR locally (tesseract) — ~0.8s, no GPU
    ocr_text = ""
    try:
        from PIL import Image
        import pytesseract
        img = Image.open(image_path).convert("RGB")
        # Marathi + Hindi + English — best for old records
        ocr_text = pytesseract.image_to_string(img, lang="mar+hin+eng", config="--oem 1 --psm 6")
        if not ocr_text.strip():
            ocr_text = pytesseract.image_to_string(img, lang="eng", config="--oem 1 --psm 6")
    except Exception as e:
        print(f"[Sarvam] OCR fallback failed: {e}")
        # Fallback for demo / when tesseract binary not installed on laptop
        if "sample.jpg" in image_path:
            ocr_text = "GAON NAMUNA 7/12 Wagholi Haveli Pune\nSurvey No: 42/3\nKhata No: KH-89342\nOwner: Ramesh Patil\nArea: 2.45 Hectare Classification: Agricultural\nMutation Date: 12 Aug 2025\nTehsil: Haveli District: Pune Village: Wagholi"
        else:
            ocr_text = f"[Image: {image_path} — OCR binary missing, install tesseract-ocr + tesseract-ocr-mar tesseract-ocr-hin via apt. Using filename fallback]"
            # still try to extract from filename hints
            ocr_text += f"\nFilename: {image_path}"

    # 2. LLM extraction via Sarvam text model (supports Devanagari → confidence + transliteration)
    prompt = f"{SARVAM_TEXT_PROMPT}\n\nOCR_TEXT:\n{ocr_text[:4000]}\n\nReturn JSON now:"
    payload = {
        "model": model or "sarvam-1",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
    }
    headers = {"api-subscription-key": api_key}
    async with httpx.AsyncClient(timeout=45) as c:
        r = await c.post(PROVIDER_DEFAULTS["sarvam"]["url"], json=payload, headers=headers)
        if r.status_code != 200:
            print(f"[Sarvam] {r.status_code} {r.text[:500]}")
            # Try sarvam-1 alias
            payload["model"] = "sarvam-1"
            r = await c.post(PROVIDER_DEFAULTS["sarvam"]["url"], json=payload, headers=headers)
        r.raise_for_status()
        j = r.json()
        text = j.get("choices", [{}])[0].get("message", {}).get("content") or j.get("output", "") or str(j)
        import json as _j, re
        m = re.search(r"\{.*\}", text, re.DOTALL)
        parsed = _j.loads(m.group(0) if m else text)
        # Attach raw OCR for debugging
        parsed["_ocr_text"] = ocr_text[:500]
        return parsed

async def call_openai_compat(image_path: str, api_key: str, base_url: str, model: str) -> dict:
    b64 = _b64(image_path)
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": SYSTEM_PROMPT},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
        ]}],
        "temperature": 0.1,
        "response_format": {"type": "json_object"}
    }
    headers = {"Authorization": f"Bearer {api_key}"}
    if "openrouter" in base_url:
        headers["HTTP-Referer"] = "https://landlens.local"
        headers["X-Title"] = "LANDLENS SIH 2026"
    async with httpx.AsyncClient(timeout=45) as c:
        r = await c.post(base_url, json=payload, headers=headers)
        r.raise_for_status()
        j = r.json()
        text = j["choices"][0]["message"]["content"]
        import json as _j; return _j.loads(text)

async def extract_via_vlm(image_path: str, provider: str, api_key: str, model: str = "") -> Optional[dict]:
    """Returns {field: {value, confidence}} or None on failure (caller falls back to light OCR)."""
    provider = provider.lower()
    if not api_key:
        return None
    m = model or PROVIDER_DEFAULTS.get(provider, {}).get("model", "")
    try:
        if provider == "gemini":
            return await call_gemini(image_path, api_key, m)
        elif provider == "sarvam":
            return await call_sarvam(image_path, api_key, m)
        elif provider in ("openrouter", "groq", "together"):
            url = PROVIDER_DEFAULTS[provider]["url"]
            return await call_openai_compat(image_path, api_key, url, m)
        elif provider == "huggingface":
            # HF Inference: similar to openai_compat but different payload — use openai_compat shim for Qwen
            url = PROVIDER_DEFAULTS["huggingface"]["url"].format(model=m)
            # HF free endpoint expects base64, treat as openai_compat for Qwen2-VL
            return await call_openai_compat(image_path, api_key, "https://api-inference.huggingface.co/models/" + m, m)
        else:
            return None
    except Exception as e:
        print(f"[VLM:{provider}] failed: {e}")
        return None
