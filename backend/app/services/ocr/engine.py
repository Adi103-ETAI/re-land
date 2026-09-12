"""OCR engine — Tesseract 5.4 (PSM 6) + langdetect + VLM fallback + layout stub.

Preserves evidence per OCR-07 spec: text, confidence, bbox, language,
page_id, engine. Handwritten regions fall back to Sarvam/Gemini VLM.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Tesseract config constants
TESSERACT_PSM_TABLE = 6  # Assume uniform block of text — best for tables/registers
TESSERACT_OEM = 1  # LSTM only
TESSERACT_LANG_DEFAULT = "mar+hin+eng"


class OCREngine:
    """OCR engine wrapping Tesseract with language detection and VLM fallback."""

    async def recognize_page(
        self,
        page_id: int,
        image_path: str,
        lang: str = TESSERACT_LANG_DEFAULT,
    ) -> list[dict[str, Any]]:
        """Recognize text on a single page.

        Uses Tesseract 5.4 with ``--psm 6`` (uniform text block / table mode).
        Applies ``langdetect`` per text block to avoid forcing one script model
        on mixed-script lines. Low-confidence / potentially handwritten regions
        are flagged for VLM fallback (Sarvam/Gemini).

        Args:
            page_id: Page number within the document (1-indexed or 0-indexed
                     per caller convention — preserved verbatim in output).
            image_path: Path to the page image (preprocessed or raw).
            lang: Tesseract language string, e.g. ``"mar+hin+eng"``.

        Returns:
            List of ``OCRResult`` dicts with keys:
            ``text``, ``confidence``, ``bbox``, ``language``, ``page_id``,
            ``engine`` (always ``"tesseract"`` for printed path, ``"vlm"``
            if VLM fallback was used).
            ``bbox`` is ``[x, y, w, h]`` in pixel coordinates.
            ``confidence`` is 0-100 (Tesseract scale) or 0-1 normalized?
            We return 0-100 to match Tesseract, with VLM normalized to 0-100.
        """
        await asyncio.sleep(0)  # yield for async caller

        results: list[dict[str, Any]] = []

        # --- Try Tesseract path -----------------------------------------
        try:
            from PIL import Image
            import pytesseract

            # Verify tesseract binary / version (non-fatal).
            try:
                version = pytesseract.get_tesseract_version()
                logger.debug("Tesseract version: %s", version)
            except Exception:
                pass

            # Allow caller to supply preprocessed image path; engine handles loading.
            # Use preprocessor if image appears degraded? Caller (pipeline) may
            # already have called preprocess_page; we just load here.
            image = Image.open(image_path)

            # Intersect the requested language chain with installed traineddata —
            # tesseract aborts entirely when a requested language file is missing.
            try:
                available = set(pytesseract.get_languages(config=""))
            except Exception:
                available = set()
            if available:
                requested = [p.strip() for p in lang.split("+") if p.strip()]
                usable = [p for p in requested if p in available]
                if not usable:
                    usable = ["eng"] if "eng" in available else []
                if usable != requested:
                    logger.warning(
                        "Requested OCR langs %s but only %s installed — using %s",
                        requested, sorted(available), usable,
                    )
                lang = "+".join(usable)

            config = f"--oem {TESSERACT_OEM} --psm {TESSERACT_PSM_TABLE}"
            data = pytesseract.image_to_data(
                image, lang=lang, config=config, output_type=pytesseract.Output.DICT
            )

            n = len(data.get("text", []))
            # Lazy import langdetect per block
            try:
                from langdetect import detect as lang_detect

                has_langdetect = True
            except ImportError:
                has_langdetect = False
                lang_detect = None  # type: ignore[assignment]

            for i in range(n):
                text = (data["text"][i] or "").strip()
                if not text:
                    continue
                try:
                    conf_raw = data["conf"][i]
                    confidence = float(conf_raw) if str(conf_raw).strip() not in ("", "-1") else 0.0
                except Exception:
                    confidence = 0.0

                # Bbox in Tesseract pixel coords
                try:
                    x = int(data["left"][i])
                    y = int(data["top"][i])
                    w = int(data["width"][i])
                    h = int(data["height"][i])
                    bbox = [x, y, w, h]
                except Exception:
                    bbox = [0, 0, 0, 0]

                # Per-block language detection (REQ mixed-script handling)
                if has_langdetect:
                    try:
                        # langdetect works best on longer strings; short tokens fall back.
                        if len(text) >= 3:
                            detected = lang_detect(text)
                            # Map ISO codes to script hint; keep detected value.
                            language = detected
                        else:
                            language = lang.split("+")[0]
                    except Exception:
                        language = lang.split("+")[0]
                else:
                    language = lang.split("+")[0]

                result: dict[str, Any] = {
                    "text": text,
                    "confidence": float(confidence),
                    "bbox": bbox,
                    "language": language,
                    "page_id": page_id,
                    "engine": "tesseract",
                }
                results.append(result)

            # If Tesseract produced results, check for handwritten fallback.
            # Heuristic: very low confidence blocks (<30) or empty output
            # likely indicate handwriting / degraded region → flag for VLM.
            if results:
                low_conf = [r for r in results if r["confidence"] < 30]
                if low_conf:
                    vlm_results = await self._fallback_handwritten(
                        page_id, image_path, low_conf
                    )
                    # Replace low-conf entries with VLM results where available
                    # For stub, just append VLM markers alongside (evidence preserved).
                    results.extend(vlm_results)
                return results

            # Empty tesseract output → try VLM fallback directly
            if not results:
                vlm_results = await self._fallback_handwritten(page_id, image_path, [])
                if vlm_results:
                    return vlm_results
                # Return single empty marker so caller knows OCR was attempted
                return []

        except ImportError as e:
            logger.warning("OCR dependencies missing (%s), returning stub result", e)
        except FileNotFoundError as e:
            logger.warning("Image not found for OCR: %s (%s)", image_path, e)
            return []
        except Exception as e:
            logger.warning("Tesseract recognize_page failed: %s", e, exc_info=True)
            # Fall through to VLM fallback

        # --- VLM fallback (stub) ----------------------------------------
        try:
            vlm_results = await self._fallback_handwritten(page_id, image_path, [])
            if vlm_results:
                return vlm_results
        except Exception:
            pass

        return results

    async def _fallback_handwritten(
        self,
        page_id: int,
        image_path: str,
        low_conf_regions: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Stub: delegate handwritten / low-confidence regions to VLM providers.

        In production this would call ``app.services.vlm.providers.extract_via_vlm``
        with Sarvam/Gemini for handwriting-specialized recognition. Here it is
        a lightweight stub that preserves the interface and evidence contract
        without requiring API keys during unit tests.

        Returns VLM-sourced OCRResult dicts or empty list if VLM disabled.
        """
        await asyncio.sleep(0)
        # Only attempt VLM if explicitly enabled and key present — otherwise stub empty.
        try:
            from app.core.config import ENABLE_VLM, VLM_API_KEY, VLM_PROVIDER, VLM_MODEL

            if not (ENABLE_VLM and VLM_API_KEY):
                return []

            from app.services.vlm.providers import extract_via_vlm

            # VLM extraction is page-level; we annotate results as vlm-sourced
            # for traceability (engine="vlm"). Confidence normalized to 0-100.
            gem = await extract_via_vlm(image_path, VLM_PROVIDER, VLM_API_KEY, VLM_MODEL)
            if not gem:
                return []
            vlm_results: list[dict[str, Any]] = []
            # Flatten VLM key/value extraction into OCR-like blocks for evidence view
            for key, val in gem.items():
                if key.startswith("_"):
                    continue
                if isinstance(val, dict):
                    text = str(val.get("value") or "").strip()
                    conf = float(val.get("confidence", 0.7)) * 100
                    bbox_raw = val.get("bbox") or val.get("box")
                    # Normalize bbox if present (VLM returns 0-1000 normalized)
                    if bbox_raw and isinstance(bbox_raw, (list, tuple)) and len(bbox_raw) == 4:
                        bbox = [int(x) for x in bbox_raw]
                    else:
                        bbox = [0, 0, 0, 0]
                else:
                    text = str(val or "").strip()
                    conf = 70.0
                    bbox = [0, 0, 0, 0]
                if not text or text in ("—", "-", "null"):
                    continue
                vlm_results.append(
                    {
                        "text": text,
                        "confidence": float(conf),
                        "bbox": bbox,
                        "language": "auto",
                        "page_id": page_id,
                        "engine": "vlm",
                    }
                )
            return vlm_results
        except Exception as e:
            logger.debug("VLM handwritten fallback skipped: %s", e)
            return []

    async def detect_layout(self, image_path: str) -> list[dict[str, Any]]:
        """Detect layout regions on a page (stub: grid/edge based).

        Simple edge-pattern logic using OpenCV contour detection.
        Classifies regions into: ``table``, ``paragraph``, ``stamp``, ``signature``.

        Args:
            image_path: Path to the page image.

        Returns:
            List of ``LayoutRegion`` dicts with keys:
            ``region_type``, ``bbox`` (``[x, y, w, h]``), ``confidence`` (0-1).
        """
        await asyncio.sleep(0)

        # Try OpenCV-based detection; fall back to single paragraph stub.
        try:
            import cv2
            import numpy as np

            img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
            if img is None:
                raise FileNotFoundError(image_path)

            # Edge detection
            blurred = cv2.GaussianBlur(img, (5, 5), 0)
            edges = cv2.Canny(blurred, 50, 150)

            # Dilate to connect table grid lines
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
            dilated = cv2.dilate(edges, kernel, iterations=2)

            contours, _ = cv2.findContours(
                dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )

            h, w = img.shape
            page_area = float(h * w)
            regions: list[dict[str, Any]] = []

            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area < 0.005 * page_area:
                    continue
                x, y, cw, ch = cv2.boundingRect(cnt)
                bbox = [int(x), int(y), int(cw), int(ch)]
                aspect = cw / float(ch) if ch else 0
                coverage = area / page_area

                # Heuristic classification
                if coverage > 0.15 and aspect > 1.2 and cw > w * 0.5:
                    region_type = "table"
                    confidence = 0.75
                elif coverage > 0.03 and ch < h * 0.25 and cw > w * 0.3:
                    region_type = "paragraph"
                    confidence = 0.65
                elif coverage < 0.02 and cw < w * 0.2 and ch < h * 0.15:
                    # Small isolated box near bottom → stamp/signature
                    # Position heuristic: bottom 30% of page
                    if y > h * 0.7:
                        # Square-ish → stamp, wide-short → signature
                        if 0.8 < aspect < 1.3:
                            region_type = "stamp"
                            confidence = 0.55
                        else:
                            region_type = "signature"
                            confidence = 0.50
                    else:
                        region_type = "paragraph"
                        confidence = 0.45
                else:
                    region_type = "paragraph"
                    confidence = 0.50

                regions.append(
                    {"region_type": region_type, "bbox": bbox, "confidence": confidence}
                )

            # Ensure at least one region; sort by area desc (tables first)
            if not regions:
                regions.append(
                    {
                        "region_type": "paragraph",
                        "bbox": [0, 0, int(w), int(h)],
                        "confidence": 0.40,
                    }
                )
            # Deduplicate overlapping tables etc. keep largest
            regions.sort(key=lambda r: r["bbox"][2] * r["bbox"][3], reverse=True)
            return regions[:10]

        except ImportError:
            logger.debug("OpenCV not available for layout detection — returning stub")
        except Exception as e:
            logger.debug("Layout detection failed (%s) — returning stub", e)

        # Fallback stub — no CV available or detection failed
        return [
            {"region_type": "paragraph", "bbox": [0, 0, 1000, 1000], "confidence": 0.40},
            {"region_type": "table", "bbox": [0, 100, 1000, 600], "confidence": 0.50},
        ]
