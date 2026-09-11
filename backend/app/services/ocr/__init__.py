"""OCR service package — preprocessing, tesseract engine, layout detection."""

from app.services.ocr.engine import OCREngine
from app.services.ocr.preprocess import preprocess_page

__all__ = ["OCREngine", "preprocess_page"]
