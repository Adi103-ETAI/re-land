"""LANDLENS FastAPI application."""
import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import jobs, records, upload, validate, verify
from app.api.v1.auth import router as auth_router
from app.services.pipeline_db import SessionFactory, init_db

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("landlens")

VERSION = "0.4.0"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()  # create tables + seed demo officers (idempotent)
    logger.info("LANDLENS API %s ready", VERSION)
    yield


app = FastAPI(
    title="LANDLENS Extraction API",
    version=VERSION,
    lifespan=lifespan,
    docs_url=os.getenv("DOCS_URL", "/docs") or None,
    redoc_url=None,
)

# ── CORS: comma-separated list via CORS_ORIGINS; "*" only for local dev ──
_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
allow_all = "*" in _origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else _origins,
    allow_credentials=not allow_all,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)
app.add_middleware(GZipMiddleware, minimum_size=1024)


# ── Baseline security headers on every response ─────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    duration_ms = (time.perf_counter() - started) * 1000
    logger.info("%s %s -> %s (%.1fms)", request.method, request.url.path, response.status_code, duration_ms)
    return response


# ── Uniform error envelope for unhandled exceptions ─────────────────────
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Auth routes
app.include_router(auth_router, prefix="/api/v1")

# Core routes
app.include_router(upload.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(records.router, prefix="/api/v1")
app.include_router(validate.router, prefix="/api/v1")
app.include_router(verify.router, prefix="/api/v1")


@app.get("/health")
async def health():
    """Liveness + database readiness probe (used by Docker healthchecks)."""
    try:
        from sqlalchemy import text

        async with SessionFactory() as session:
            await session.execute(text("SELECT 1"))
        db_ok = True
    except Exception:  # noqa: BLE001 — health probe must never raise
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "database": db_ok, "version": VERSION}
