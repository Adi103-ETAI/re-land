from pydantic import BaseModel

class BBox(BaseModel):
    x: float; y: float; w: float; h: float

class FieldWithConfidence(BaseModel):
    key: str          # surveyNo, khataNo, ownerName, area, village, tehsil, district, classification, mutationDate
    value: str
    confidence: float # 0-1
    bbox: BBox | None = None
    source: str       # rule | ml | fusion

class CaseRecordOut(BaseModel):
    recId: str
    owner: str
    survey: str
    khata: str
    village: str
    tehsil: str
    district: str
    area: float
    areaDb: float
    classification: str
    mutationDate: str
    lang: str
    docLabel: str
    validationScore: int
    fields: list[FieldWithConfidence]

class JobStatus(BaseModel):
    jobId: str
    status: str  # queued | preprocess | ocr | extracting | validating | done | failed
    progress: int
    record: CaseRecordOut | None = None
    error: str | None = None
