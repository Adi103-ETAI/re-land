"""Image preprocessing for OCR — grayscale, CLAHE, threshold, denoise, deskew.

Covers degraded-scan handling (REQ-AI-004): faded/low-contrast pages,
stained or partially damaged scans. Ported from prototype's laptop-friendly
stack (no torch needed).
"""

from __future__ import annotations

import asyncio
from pathlib import Path

from PIL import Image


async def preprocess_page(image_path: str) -> Image.Image:
    """Clean a single page image for OCR.

    Steps:
    1. Open image and convert to grayscale
    2. CLAHE contrast enhancement (lab / grayscale)
    3. Adaptive Gaussian threshold (binary)
    4. Denoise with fastNlMeansDenoising
    5. Deskew via minAreaRect rotation
    6. Return cleaned PIL Image (mode L)

    The function is async for pipeline compatibility but the underlying
    OpenCV operations are synchronous and run in the event loop.
    For production scale they should be offloaded with ``run_in_executor``.

    Args:
        image_path: Absolute or relative path to the page image.

    Returns:
        Cleaned ``PIL.Image`` in grayscale (mode ``L``).
    """
    # Allow caller to `await` without blocking; preprocessing itself is CPU-bound.
    # Yield control once so the event loop can report progress.
    await asyncio.sleep(0)

    # --- 1. Open image --------------------------------------------------
    # Prefer OpenCV for the pipeline, fall back to PIL if cv2 is unavailable.
    try:
        import cv2
        import numpy as np

        has_cv2 = True
    except ImportError:
        has_cv2 = False  # type: ignore[assignment]

    if not has_cv2:
        # Minimal fallback: PIL grayscale only.
        img = Image.open(image_path).convert("L")
        return img

    # Re-import for type checkers (already imported above)
    import cv2  # noqa: F811
    import numpy as np  # noqa: F811

    img_cv = cv2.imread(image_path, cv2.IMREAD_COLOR)
    if img_cv is None:
        # Corrupt path or unsupported format — try PIL.
        pil = Image.open(image_path).convert("L")
        return pil

    # --- 2. Grayscale ---------------------------------------------------
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)

    # --- 3. CLAHE contrast enhancement ----------------------------------
    # Improves faded / low-contrast scans before thresholding.
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # --- 4. Adaptive Gaussian threshold ---------------------------------
    # Handles uneven illumination across old registers.
    # blockSize must be odd; C is the constant subtracted from mean.
    thresh = cv2.adaptiveThreshold(
        enhanced,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        10,
    )

    # --- 5. Denoise (fastNlMeansDenoising) ------------------------------
    # Removes speckle/stain noise while preserving strokes.
    try:
        denoised = cv2.fastNlMeansDenoising(thresh, None, 10, 7, 21)
    except Exception:
        denoised = thresh

    # --- 6. Deskew via minAreaRect --------------------------------------
    # Find foreground (text) pixels, compute minimum area rectangle angle.
    deskewed = denoised
    try:
        # Invert so text is white for coordinate extraction when using binary image
        # where text is black (0) on white (255).
        coords = np.column_stack(np.where(denoised < 200))
        if len(coords) > 100:
            rect = cv2.minAreaRect(coords)
            angle = rect[-1]
            # minAreaRect returns angle in [-90, 0); normalize to deskew angle.
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle
            # Only correct if skew is noticeable (>0.5 deg) but not extreme (<30).
            if 0.5 < abs(angle) < 30:
                (h, w) = denoised.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                deskewed = cv2.warpAffine(
                    denoised,
                    M,
                    (w, h),
                    flags=cv2.INTER_CUBIC,
                    borderMode=cv2.BORDER_REPLICATE,
                )
    except Exception:
        deskewed = denoised

    # --- 7. Return as PIL Image (mode L) --------------------------------
    pil_image = Image.fromarray(deskewed)
    # Ensure mode is L (grayscale).
    if pil_image.mode != "L":
        pil_image = pil_image.convert("L")
    return pil_image
