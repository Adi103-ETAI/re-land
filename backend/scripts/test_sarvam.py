#!/usr/bin/env python3
"""Quick test: python3 backend/scripts/test_sarvam.py /path/to/old_record.jpg"""
import asyncio, sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.services.vlm.providers import extract_via_vlm

async def main():
    img = sys.argv[1] if len(sys.argv) > 1 else "backend/data/golden_samples/sample.jpg"
    provider = os.getenv("VLM_PROVIDER", "sarvam")
    key = os.getenv("VLM_API_KEY", "")
    model = os.getenv("VLM_MODEL", "sarvam-m")
    if not key:
        print("Set VLM_API_KEY in env or backend/.env — e.g. export VLM_API_KEY=sk_...")
        sys.exit(1)
    print(f"Testing {provider}:{model} on {img}...")
    res = await extract_via_vlm(img, provider, key, model)
    print(json.dumps(res, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv("backend/.env")
    load_dotenv(".env")
    asyncio.run(main())
