"""Supabase service for LANDLENS backend (optional).

The backend works fine without Supabase — the frontend persists all
records/documents/audit data directly to Supabase via the anon key.
When SUPABASE_URL + SUPABASE_SERVICE_KEY are configured, backend code
can additionally read/write Supabase with service-level privileges.
"""
import logging
from typing import Optional

from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

logger = logging.getLogger(__name__)

_client = None


def get_client():
    """Return the service-role Supabase client, or None when unconfigured."""
    global _client
    if _client is not None:
        return _client
    if not (SUPABASE_URL and SUPABASE_SERVICE_KEY):
        return None
    try:
        from supabase import create_client, Client  # optional dependency

        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        return _client
    except ImportError:
        logger.warning("supabase package not installed — pip install supabase to enable service-level access")
        return None
    except Exception as e:
        logger.warning("Could not initialize Supabase client: %s", e)
        return None


async def get_user_profile(user_id: str) -> Optional[dict]:
    """Get user profile from Supabase."""
    client = get_client()
    if not client:
        return None
    response = client.table("profiles").select("*").eq("id", user_id).single().execute()
    return response.data if response.data else None


async def get_pipeline_stats() -> dict:
    """Get pipeline statistics from Supabase (empty when unconfigured)."""
    client = get_client()
    if not client:
        return {"documents": [], "records": []}
    docs_response = client.table("documents").select("status").execute()
    records_response = client.table("records").select("validation_status").execute()

    def tally(rows, key):
        out: dict = {}
        for r in rows or []:
            k = r.get(key)
            out[k] = out.get(k, 0) + 1
        return [{"key": k, "count": v} for k, v in out.items()]

    return {
        "documents": tally(docs_response.data, "status"),
        "records": tally(records_response.data, "validation_status"),
    }
