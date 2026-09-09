from fastapi import APIRouter
from app.schemas.record import CaseRecordOut
router = APIRouter()

@router.get("/records/{rec_id}", response_model=CaseRecordOut)
def get_record(rec_id: str):
    # TODO: fetch from DB + join fields
    raise NotImplementedError
