"""Root API router — wires all v1 sub-routers (aggregated convenience export)."""
from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.records import router as records_router
from app.api.v1.upload import router as upload_router
from app.api.v1.validate import router as validate_router
from app.api.v1.verify import router as verify_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth_router)
api_v1_router.include_router(upload_router)
api_v1_router.include_router(jobs_router)
api_v1_router.include_router(records_router)
api_v1_router.include_router(validate_router)
api_v1_router.include_router(verify_router)
