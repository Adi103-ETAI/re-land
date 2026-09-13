"""LANDLENS FastAPI application."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import upload, jobs, records
from app.api.v1.auth import router as auth_router
from app.api.v1.endpoints import router as endpoints_router
from app.core.config import CORS_ORIGINS
from app.core.db import init_db

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist + seed default officers (idempotent)
    await init_db()
    yield
    # Shutdown: nothing to release yet


app = FastAPI(
    title="LANDLENS Extraction API",
    version="0.3.0",
    lifespan=lifespan,
)

# On Render/Vercel, allow the deployed frontend origin in addition to localhost.
# Set CORS_ORIGINS env to e.g. https://your-app.vercel.app,https://*.vercel.app,http://localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth routes
app.include_router(auth_router, prefix="/api/v1")

# Core routes
app.include_router(upload.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(records.router, prefix="/api/v1")
# DB-backed endpoints: POST /jobs/upload, POST /records/{id}/validate,
# POST /verify/{task_id}, GET /tasks/{officer_id}
app.include_router(endpoints_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
