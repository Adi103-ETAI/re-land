"""LANDLENS FastAPI application."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import jobs, records, upload, validate, verify
from app.api.v1.auth import router as auth_router
from app.services.pipeline_db import init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()  # create tables + seed demo officers (idempotent)
    yield


app = FastAPI(title="LANDLENS Extraction API", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev: frontend proxies server-side; tighten for prod
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
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
def health():
    return {"status": "ok"}
