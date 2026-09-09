import os
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/landlens")
S3_BUCKET = os.getenv("S3_BUCKET", "landlens-raw")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Careful extraction thresholds — never auto-approve below these
CONF_THRESHOLD = float(os.getenv("CONF_THRESHOLD", "0.90"))
CRITICAL_FIELDS = {"surveyNo", "khataNo", "ownerName", "area"}

# ── VLM provider — Gemini active (user key) ──
# gemini | sarvam | openrouter | huggingface | groq | together | replicate
VLM_PROVIDER = os.getenv("VLM_PROVIDER", "gemini")
VLM_API_KEY = os.getenv("VLM_API_KEY", "")
VLM_MODEL = os.getenv("VLM_MODEL", "gemini-3.5-flash")  # auto-default per provider if empty
ENABLE_VLM = os.getenv("ENABLE_VLM", "true").lower() == "true"  # false = light local only
