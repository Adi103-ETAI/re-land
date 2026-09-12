"""Update config for Supabase integration."""
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")  # Keep for future use
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

S3_BUCKET = os.getenv("S3_BUCKET", "landlens-raw")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Careful extraction thresholds
CONF_THRESHOLD = float(os.getenv("CONF_THRESHOLD", "0.90"))
CRITICAL_FIELDS = {"surveyNo", "khataNo", "ownerName", "area"}

# VLM provider
VLM_PROVIDER = os.getenv("VLM_PROVIDER", "gemini")
VLM_API_KEY = os.getenv("VLM_API_KEY", "")
VLM_MODEL = os.getenv("VLM_MODEL", "gemini-3.5-flash")
ENABLE_VLM = os.getenv("ENABLE_VLM", "true").lower() == "true"