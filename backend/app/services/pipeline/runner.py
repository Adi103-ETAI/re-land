"""LANDLENS pipeline — preprocess → layout → OCR → extraction → validation → decision.

Drives a ProcessingJob through the DB stage rows, keeps the in-memory jobs
store (app.core.jobs) updated for the polling API, and persists everything:
OCR results, layout regions, extracted record + fields + evidence, validation
run, verification task / approval, and audit events.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select, update

from app.core import config
from app.core.jobs import set_done, set_error, set_progress
from app.models import (
    AuditEvent,
    ActionType,
    DocumentPage,
    EntityType,
    ExtractedRecord,
    FieldEvidence,
    LayoutRegion,
    LayoutRegionType,
    OCRResult,
    ProcessingJob,
    ProcessingStage,
    RecordField,
    RecordStatus,
    StageName,
    StageStatus,
)
from app.services.ocr.engine import OCREngine
from app.services.ocr.preprocess import preprocess_page
from app.services.pipeline_db import SEED, get_session_factory, mark_job_failed
from app.services.validation.engine import ValidationEngine

logger = logging.getLogger(__name__)

_layout_type_map = {
    "table": LayoutRegionType.TABLE,
    "paragraph": LayoutRegionType.OTHER,
    "stamp": LayoutRegionType.STAMP,
    "signature": LayoutRegionType.SIGNATURE,
}
MAX_OCR_ROWS = 600


class PipelineOrchestrator:
    def __init__(self, session_factory=None):
        self.session_factory = session_factory or get_session_factory()
        self.ocr = OCREngine()

    # ── public entry ─────────────────────────────────────────────────────
    async def process_document(self, job_id: int, store_id: str | None = None, lang_label: str = "Marathi") -> None:
        store_id = store_id or f"job_{job_id}"
        factory = self.session_factory
        try:
            async with factory() as session:
                job = await session.get(ProcessingJob, job_id)
                if job is None:
                    raise ValueError(f"job {job_id} not found")
                job.overall_status = StageStatus.RUNNING
                job.started_at = datetime.now(timezone.utc)
                page = (await session.execute(
                    select(DocumentPage).where(DocumentPage.document_id == job.document_id)
                )).scalars().first()
                await session.commit()
            if page is None:
                raise ValueError(f"no document page for job {job_id}")
            image_path = page.image_storage_reference

            # ── Stage group 1: classification / language / preprocessing ──
            await self._open_group(job_id, [StageName.DOCUMENT_CLASSIFICATION, StageName.LANGUAGE_DETECTION,
                                            StageName.PAGE_ANALYSIS, StageName.IMAGE_PREPROCESSING])
            set_progress(store_id, "preprocess", 12)
            cleaned = await preprocess_page(image_path)
            cleaned_path = str(Path(image_path).with_name(Path(image_path).stem + "_cleaned.png"))
            cleaned.save(cleaned_path)
            await self._close_group(job_id)

            # ── Stage group 2: layout ─────────────────────────────────────
            await self._open_group(job_id, [StageName.LAYOUT_REGION_DETECTION])
            set_progress(store_id, "ocr", 30)
            regions = await self.ocr.detect_layout(image_path)
            await self._save_regions(page.id, regions)
            await self._close_group(job_id)

            # ── Stage group 3: OCR ────────────────────────────────────────
            await self._open_group(job_id, [StageName.OCR_HANDWRITING_RECOGNITION])
            set_progress(store_id, "ocr", 45)
            blocks = await self.ocr.recognize_page(1, image_path, lang=config.OCR_LANG_CHAIN)
            set_progress(store_id, "ocr", 55)
            await self._close_group(job_id)
            await self._open_group(job_id, [StageName.RECORD_SEGMENTATION])
            await self._close_group(job_id)

            # ── Stage group 4: extraction ─────────────────────────────────
            await self._open_group(job_id, [StageName.FIELD_EXTRACTION, StageName.FIELD_CLASSIFICATION,
                                            StageName.NORMALIZATION, StageName.RECORD_RECONSTRUCTION])
            set_progress(store_id, "extracting", 68)
            from PIL import Image

            with Image.open(image_path) as im:
                size = (im.width, im.height)
            from app.services.extraction.runner import build_record

            built = build_record(blocks, size, lang_label)
            set_progress(store_id, "extracting", 80)
            rec_pk, flat = await self._persist_extraction(job_id, page.id, blocks, built)
            await self._close_group(job_id)

            # ── Stage group 5: validation + decision ──────────────────────
            await self._open_group(job_id, [StageName.VALIDATION, StageName.DECISION])
            set_progress(store_id, "validating", 90)
            async with factory() as session:
                result = await ValidationEngine().run_validation(rec_pk, session)
            flat["validationScore"] = int(result["confidence_score"])
            flat["dupSim"] = int(result.get("duplicate", {}).get("dupSim", 0))
            flat["dupMatch"] = result.get("duplicate", {}).get("dupMatch")
            await self._close_group(job_id, finish_job=True)

            set_done(store_id, flat)
            logger.info("job %s complete — record rec_%s score %s", store_id, rec_pk, flat["validationScore"])

        except Exception as exc:  # noqa: BLE001 — pipeline must never crash the API
            logger.exception("pipeline failed for job %s", job_id)
            set_error(store_id, str(exc))
            await mark_job_failed(job_id, factory)

    # ── stage helpers ────────────────────────────────────────────────────
    async def _open_group(self, job_id: int, stages: list[StageName]) -> None:
        async with self.session_factory() as session:
            await session.execute(
                update(ProcessingStage)
                .where(ProcessingStage.job_id == job_id, ProcessingStage.stage_name.in_(stages))
                .values(status=StageStatus.RUNNING, started_at=datetime.now(timezone.utc))
            )
            await session.commit()

    async def _close_group(self, job_id: int, stages: list[StageName] | None = None, finish_job: bool = False) -> None:
        async with self.session_factory() as session:
            if stages is None:
                await session.execute(
                    update(ProcessingStage)
                    .where(ProcessingStage.job_id == job_id, ProcessingStage.status == StageStatus.RUNNING)
                    .values(status=StageStatus.COMPLETED, completed_at=datetime.now(timezone.utc),
                            progress_percentage=100.0)
                )
            else:
                await session.execute(
                    update(ProcessingStage)
                    .where(ProcessingStage.job_id == job_id, ProcessingStage.stage_name.in_(stages))
                    .values(status=StageStatus.COMPLETED, completed_at=datetime.now(timezone.utc),
                            progress_percentage=100.0)
                )
            if finish_job:
                job = await session.get(ProcessingJob, job_id)
                if job is not None:
                    job.overall_status = StageStatus.COMPLETED
                    job.completed_at = datetime.now(timezone.utc)
            await session.commit()

    # ── persistence ──────────────────────────────────────────────────────
    async def _save_regions(self, page_id: int, regions: list[dict]) -> None:
        async with self.session_factory() as session:
            for r in regions[:10]:
                session.add(LayoutRegion(
                    page_id=page_id,
                    region_type=_layout_type_map.get(r.get("region_type", "paragraph"), LayoutRegionType.OTHER),
                    bounding_box={"x": r["bbox"][0], "y": r["bbox"][1], "w": r["bbox"][2], "h": r["bbox"][3]},
                ))
            await session.commit()

    async def _persist_ocr(self, page_id: int, blocks: list[dict]) -> list[int]:
        """Store OCR word blocks; return row ids aligned with block indices."""
        ids: list[int] = []
        async with self.session_factory() as session:
            for b in blocks[:MAX_OCR_ROWS]:
                x, y, w, h = b.get("bbox") or [0, 0, 0, 0]
                row = OCRResult(
                    page_id=page_id,
                    recognized_text=b.get("text", ""),
                    confidence=float(b.get("confidence", 0.0)),
                    language=b.get("language"),
                    bounding_box={"x": x, "y": y, "w": w, "h": h},
                    engine=b.get("engine", "tesseract"),
                )
                session.add(row)
                await session.flush()
                ids.append(row.id)
        return ids

    async def _persist_extraction(self, job_id: int, page_id: int, blocks: list[dict], built: dict):
        """Create ExtractedRecord + RecordField + FieldEvidence rows."""
        ocr_ids = await self._persist_ocr(page_id, blocks)
        lines = built["ocr_lines"]

        async with self.session_factory() as session:
            record = ExtractedRecord(
                document_id=(await session.get(ProcessingJob, job_id)).document_id,
                document_type=built["record"]["docLabel"],
                status=RecordStatus.EXTRACTED,
                extraction_confidence=(
                    sum(f["confidence"] for f in built["fields"]) / max(1, len(built["fields"]))
                ),
            )
            session.add(record)
            await session.flush()

            for f in built["fields"]:
                field = RecordField(
                    extracted_record_id=record.id,
                    field_name=f["key"],
                    original_value=f["value"],
                    normalized_value=f["value"],
                    ai_value=f["value"],
                    ai_confidence=float(f["confidence"]),
                    final_value=f["value"],
                    language=built["record"]["lang"],
                )
                session.add(field)
                await session.flush()

                ocr_result_id = None
                if f.get("bbox"):
                    # Field bboxes are copied from an OCR line — match by normalized box
                    for idx, ln in enumerate(lines):
                        if idx < len(ocr_ids) and ln.get("norm") == f["bbox"]:
                            ocr_result_id = ocr_ids[idx]
                            break
                if ocr_result_id is None:
                    synth = OCRResult(
                        page_id=page_id,
                        recognized_text=f["value"],
                        confidence=float(f["confidence"]) * 100.0,
                        language=built["record"]["lang"],
                        bounding_box=f.get("bbox"),
                        engine="inferred",
                    )
                    session.add(synth)
                    await session.flush()
                    ocr_result_id = synth.id

                session.add(FieldEvidence(
                    record_field_id=field.id,
                    ocr_result_id=ocr_result_id,
                    page_id=page_id,
                    bounding_box=f.get("bbox"),
                ))

            session.add(AuditEvent(
                actor_id=SEED.get("operator_id"),
                action=ActionType.EXTRACT,
                entity_type=EntityType.RECORD,
                entity_id=record.id,
                new_value=f"rec_{record.id}",
                source="pipeline",
            ))
            await session.commit()

        flat = dict(built["record"])
        flat["recId"] = f"rec_{record.id}"
        clean_fields = [
            {k: f[k] for k in ("key", "value", "confidence", "bbox", "source")}
            for f in built["fields"]
        ]
        flat["fields"] = clean_fields
        return record.id, flat
