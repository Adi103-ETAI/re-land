"""update database config to include async URL"""
import os
from dotenv import load_dotenv
load_dotenv()

# Default to local SQLite so the backend runs with zero infrastructure.
# Set DATABASE_URL to postgresql://... for production deployments.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./landlens.db")
DATABASE_URL_ASYNC = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1) if DATABASE_URL.startswith("postgresql://") else DATABASE_URL
S3_BUCKET = os.getenv("S3_BUCKET", "landlens-raw")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# CORS: comma-separated list of allowed browser origins
CORS_ORIGINS = [
    o.strip() for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",") if o.strip()
]

# Careful extraction thresholds — never auto-approve below these
CONF_THRESHOLD = float(os.getenv("CONF_THRESHOLD", "0.90"))
CRITICAL_FIELDS = {"surveyNo", "khataNo", "ownerName", "area"}

# ── VLM provider — Gemini active (user key) ──
# gemini | sarvam | openrouter | huggingface | groq | together | replicate
VLM_PROVIDER = os.getenv("VLM_PROVIDER", "gemini")
VLM_API_KEY = os.getenv("VLM_API_KEY", "")
VLM_MODEL = os.getenv("VLM_MODEL", "gemini-3.5-flash")  # auto-default per provider if empty
ENABLE_VLM = os.getenv("ENABLE_VLM", "true").lower() == "true"  # false = light local only

# Upload guardrails
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "15"))
