"""Supabase service for LANDLENS backend."""
import os
from typing import Optional, Any
from supabase import create_client, Client
from app.core.config import settings

# Initialize Supabase client
supabase: Client = create_client(settings.supabase_url, settings.supabase_service_key)

async def get_user_profile(user_id: str) -> Optional[dict]:
    """Get user profile from Supabase."""
    response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    return response.data if response.data else None

async def create_user_session(user_id: str, ip_address: str = "") -> dict:
    """Create session record in Supabase."""
    response = supabase.table("user_sessions").insert({
        "user_id": user_id,
        "ip_address": ip_address,
        "user_agent": "",
        "created_at": supabase.rpc("now")
    }).execute()
    return response.data

async def get_pipeline_stats() -> dict:
    """Get pipeline statistics."""
    # Count documents by status
    docs_response = supabase.table("documents").select("status, count()").group("status").execute()
    
    # Count records by validation status
    records_response = supabase.table("records").select("validation_status, count()").group("validation_status").execute()
    
    return {
        "documents": docs_response.data,
        "records": records_response.data
    }