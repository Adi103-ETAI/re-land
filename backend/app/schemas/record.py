from pydantic import BaseModel

class BBox(BaseModel):
    """Normalized 0-1 box (ymin/xmin/ymax/xmax) or pixel box (x/y/w/h)."""
    ymin: float | None = None
    xmin: float | None = None
    ymax: float | None = None
    xmax: float | None = None
    x: float | None = None
    y: float | None = None
    w: float | None = None
    h: float | None = None

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
