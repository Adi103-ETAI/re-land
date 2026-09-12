"""LANDLENS FastAPI application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import upload, jobs, records, validate, verify
from app.api.v1.auth import router as auth_router

app = FastAPI(title="LANDLENS Extraction API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
app.include_router(validate.router, prefix="/api/v1")
app.include_router(verify.router, prefix="/api/v1")

@app.get("/health")
def health():
    return {"status": "ok"}
