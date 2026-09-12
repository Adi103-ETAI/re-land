"""GET /records — list and fetch extracted records."""
import re

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import ExtractedRecord, RecordField
from app.schemas.record import CaseRecordOut, FieldWithConfidence

router = APIRouter()

_BBOX_KEYS = ("ymin", "xmin", "ymax", "xmax")


async def _load_record(session, record_id: int) -> ExtractedRecord:
    record = (await session.execute(
        select(ExtractedRecord)
        .options(selectinload(ExtractedRecord.fields).selectinload(RecordField.evidences))
        .where(ExtractedRecord.id == record_id)
    )).scalar_one_or_none()
    if record is None:
        raise HTTPException(404, f"record {record_id} not found")
    return record


def _field_out(f: RecordField) -> FieldWithConfidence:
    bbox = None
    if f.evidences:
        raw = f.evidences[0].bounding_box
        if raw and all(k in raw for k in _BBOX_KEYS):
            bbox = {"ymin": raw["ymin"], "xmin": raw["xmin"], "ymax": raw["ymax"], "xmax": raw["xmax"]}
        elif raw and all(k in raw for k in ("x", "y", "w", "h")):
            bbox = {"x": raw["x"], "y": raw["y"], "w": raw["w"], "h": raw["h"]}
    return FieldWithConfidence(
        key=f.field_name,
        value=(f.final_value or f.ai_value or "—"),
        confidence=round(float(f.ai_confidence or 0.0), 3),
        bbox=bbox,
        source="rule",
    )


def _values(record: ExtractedRecord) -> dict[str, str]:
    return {f.field_name: (f.final_value or f.ai_value or "—") for f in record.fields}


def _to_float(v: str) -> float:
    m = re.findall(r"\d+\.?\d*", v or "")
    return float(m[0]) if m else 0.0


@router.get("/records")
async def list_records(limit: int = 25):
    from app.services.pipeline_db import get_session_factory

    async with get_session_factory()() as session:
        stmt = (
            select(ExtractedRecord)
            .options(selectinload(ExtractedRecord.fields))
            .order_by(ExtractedRecord.id.desc())
            .limit(limit)
        )
        records = (await session.execute(stmt)).scalars().all()
        out = []
        for r in records:
            v = _values(r)
            out.append({
                "recId": f"rec_{r.id}",
                "owner": v.get("owner", "—"),
                "survey": v.get("survey", "—"),
                "village": v.get("village", "—"),
                "district": v.get("district", "—"),
                "area": _to_float(v.get("area", "0")),
                "docLabel": r.document_type or "Land Record",
                "status": r.status.value if r.status else "extracted",
                "validationScore": int(r.validation_score or 0),
            })
        return out


@router.get("/records/{rec_id}", response_model=CaseRecordOut)
async def get_record(rec_id: str):
    m = re.fullmatch(r"rec_(\d+)", rec_id)
    if not m:
        raise HTTPException(404, f"unknown record id {rec_id}")

    from app.services.pipeline_db import get_session_factory

    async with get_session_factory()() as session:
        record = await _load_record(session, int(m.group(1)))
        v = _values(record)
        fields = [_field_out(f) for f in record.fields]
        return CaseRecordOut(
            recId=f"rec_{record.id}",
            owner=v.get("owner", "—"),
            survey=v.get("survey", "—"),
            khata=v.get("khata", "—"),
            village=v.get("village", "—"),
            tehsil=v.get("tehsil", "—"),
            district=v.get("district", "—"),
            area=_to_float(v.get("area", "0")),
            areaDb=_to_float(v.get("area", "0")),
            classification=v.get("classification", "—"),
            mutationDate=v.get("mutationDate", "—"),
            lang=(record.fields[0].language if record.fields and record.fields[0].language else "Marathi"),
            docLabel=record.document_type or "Land Record",
            validationScore=int(record.validation_score or 0),
            fields=fields,
        )
