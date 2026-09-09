from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import upload, jobs, records, validate, verify

app = FastAPI(title="LANDLENS Extraction API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(records.router, prefix="/api/v1")
app.include_router(validate.router, prefix="/api/v1")
app.include_router(verify.router, prefix="/api/v1")

@app.get("/health")
def health():
    return {"status": "ok"}
