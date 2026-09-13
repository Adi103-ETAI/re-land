"""POST /records/{recId}/validate — run the validation engine on demand."""
import re

from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.post("/records/{rec_id}/validate")
async def validate_record(rec_id: str):
    m = re.fullmatch(r"rec_(\d+)", rec_id)
    if not m:
        raise HTTPException(404, f"unknown record id {rec_id}")

    from sqlalchemy.ext.asyncio import AsyncSession  # noqa: F401

    from app.services.pipeline_db import get_session_factory
    from app.services.validation.engine import ValidationEngine

    async with get_session_factory()() as session:
        try:
            result = await ValidationEngine().run_validation(int(m.group(1)), session)
        except ValueError as e:
            raise HTTPException(404, str(e))

    return {
        "recId": rec_id,
        "routing": result["routing"],
        "confidenceScore": result["confidence_score"],
        "checks": result["checks"],
        "duplicate": result.get("duplicate"),
    }
