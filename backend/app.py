from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import torch
import cv2
import numpy as np
import base64
import time
import logging
import os
from pathlib import Path
from io import BytesIO
from model_utils import load_esrgan, load_unet, enhance_image, predict_mask

try:
    from PIL import Image as PILImage
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
logger.info(f"Using device: {DEVICE}")

# ── Model paths ────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent
ESRGAN_PATH = str(BASE_DIR / "models" / "best_esrgan_generator.pth")
UNET_PATH   = str(BASE_DIR / "models" / "best_unetplusplus.pth")

# ── Load models at startup ─────────────────────────────────────────────────
esrgan_model = load_esrgan(ESRGAN_PATH, DEVICE)
unet_model   = load_unet(UNET_PATH, DEVICE)

# ── OpenRouter LLM setup ──────────────────────────────────────────────────
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_VISION_MODEL = "google/gemini-flash-1.5"   # vision-capable
OPENROUTER_TEXT_MODEL   = "google/gemini-flash-1.5"   # text-only fallback

openrouter_client = None
try:
    from openai import OpenAI
    openrouter_client = OpenAI(
        api_key=OPENROUTER_API_KEY,
        base_url=OPENROUTER_BASE_URL,
    )
    logger.info("✓ OpenRouter LLM client ready (model: %s)", OPENROUTER_VISION_MODEL)
except ImportError:
    logger.warning("openai package not installed — LLM insights will use rule-based fallback")


def image_to_base64(img: np.ndarray) -> str:
    _, buffer = cv2.imencode('.png', img)
    return base64.b64encode(buffer).decode('utf-8')


def bgr_to_b64_url(img_bgr: np.ndarray) -> str:
    """Encode a BGR numpy image as a base64 PNG data URL for the vision API."""
    _, buf = cv2.imencode('.png', img_bgr)
    b64 = base64.b64encode(buf).decode('utf-8')
    return f"data:image/png;base64,{b64}"


def generate_llm_insight(
    tumor_detected: bool,
    confidence: float,
    tumor_percentage: float,
    severity: str,
    risk: str,
    overlay_img: np.ndarray = None,
    bbox_img: np.ndarray = None,
    mask_img: np.ndarray = None,
) -> tuple[str, bool]:
    """
    Generate a clinical insight using OpenRouter Vision LLM (multimodal).
    Sends overlay, bounding-box, and mask images as base64 data URLs alongside
    numeric metrics. Falls back gracefully: Vision → Text-only → Rule-based.
    Returns (insight_text, image_powered_bool).
    """

    if openrouter_client:
        # ── Build vision message content (images + text) ──────────────────
        image_parts_count = 0
        content: list = []

        image_configs = [
            (overlay_img,  "Image 1 — Overlay: tumor segmentation mask blended over the enhanced MRI scan."),
            (bbox_img,     "Image 2 — Bounding Box: largest detected tumor region outlined with a cyan rectangle."),
        ]
        # For mask: may be grayscale (2-D), convert to BGR before encoding
        if mask_img is not None:
            mask_bgr = cv2.cvtColor(mask_img, cv2.COLOR_GRAY2BGR) \
                if len(mask_img.shape) == 2 else mask_img
            image_configs.append((mask_bgr, "Image 3 — Binary Mask: white pixels indicate predicted tumor regions."))

        for img_arr, description in image_configs:
            if img_arr is not None:
                try:
                    data_url = bgr_to_b64_url(img_arr)
                    content.append({"type": "image_url", "image_url": {"url": data_url}})
                    content.append({"type": "text",      "text": description})
                    image_parts_count += 1
                except Exception as enc_err:
                    logger.warning(f"Image encode error: {enc_err}")

        vision_prompt = f"""You are a senior radiologist AI assistant with expertise in neuro-oncology imaging.
You have been provided with {image_parts_count} output image(s) from an AI-powered MRI analysis pipeline.

Quantitative pipeline metrics:
- Tumor Detected: {tumor_detected}
- AI Confidence: {confidence:.1f}%
- Tumor Area Coverage: {tumor_percentage:.2f}% of scan
- Severity Classification: {severity}
- Risk Assessment: {risk}

Using BOTH the visual findings AND the quantitative metrics, write a GPT-style structured explanation.
Format it EXACTLY like this example (short lines, blank lines between paragraphs, no bullet points):

The AI segmentation model detected
a [finding] within the MRI scan.

The estimated tumor coverage is
approximately [X]%,
which is categorized as [severity]
severity.

The prediction confidence is
[X]%,
indicating a [strong/moderate/low] likelihood
of abnormal tissue presence.

[One more paragraph about clinical recommendation.]

Further clinical interpretation
by a medical specialist is advised.

Keep each line SHORT (under 45 characters). Use the actual numbers from the metrics. Be precise and clinical."""

        content.append({"type": "text", "text": vision_prompt})

        # ── Try vision call first ─────────────────────────────────────────
        if image_parts_count > 0:
            try:
                resp = openrouter_client.chat.completions.create(
                    model=OPENROUTER_VISION_MODEL,
                    messages=[{"role": "user", "content": content}],
                    max_tokens=512,
                    temperature=0.3,
                )
                return resp.choices[0].message.content.strip(), True
            except Exception as e:
                logger.warning(f"OpenRouter Vision error: {e} — falling back to text-only")

        # ── Text-only fallback ────────────────────────────────────────────
        try:
            text_prompt = f"""You are a senior radiologist AI assistant analyzing MRI tumor detection results.

Detection results:
- Tumor Detected: {tumor_detected}
- AI Confidence: {confidence:.1f}%
- Tumor Area Coverage: {tumor_percentage:.2f}% of scan
- Severity Classification: {severity}
- Risk Assessment: {risk}

Write a GPT-style structured explanation with SHORT lines (under 45 chars each) and blank lines between paragraphs.
Format EXACTLY like this:

The AI segmentation model detected
a [finding description]
within the MRI scan.

The estimated tumor coverage is
approximately {tumor_percentage:.2f}%,
which is categorized as {severity.lower()}
severity.

The prediction confidence is
{confidence:.1f}%,
indicating a [strong/moderate] likelihood
of [normal/abnormal] tissue presence.

[Clinical recommendation paragraph with short lines.]

Further clinical interpretation
by a medical specialist is advised.

Output ONLY the explanation text, no headers, no markdown, no bullets."""
            resp = openrouter_client.chat.completions.create(
                model=OPENROUTER_TEXT_MODEL,
                messages=[{"role": "user", "content": text_prompt}],
                max_tokens=512,
                temperature=0.3,
            )
            return resp.choices[0].message.content.strip(), False
        except Exception as e:
            logger.warning(f"OpenRouter text error: {e} — using rule-based fallback")

    # ── Rule-based GPT-style fallback ────────────────────────────────────────────────
    if not tumor_detected:
        return (
            f"""The AI segmentation model found
no significant abnormal regions
within the MRI scan.

The estimated abnormal coverage is
approximately {tumor_percentage:.2f}%,
which falls below the detection
threshold for clinical concern.

The prediction confidence is
{confidence:.1f}%,
indicating a strong likelihood
of normal tissue patterns.

Routine follow-up imaging
is recommended as per standard
clinical protocol.

Further clinical interpretation
by a medical specialist is advised.""",
            False,
        )
    elif tumor_percentage < 1.0:
        return (
            f"""The AI segmentation model detected
a possible abnormal lesion region
within the MRI scan.

The estimated tumor coverage is
approximately {tumor_percentage:.2f}%,
which is categorized as small
severity.

The prediction confidence is
{confidence:.1f}%,
indicating a moderate likelihood
of abnormal tissue presence.

This finding warrants further
clinical evaluation and expert
radiological review before
any clinical decision.

Further clinical interpretation
by a medical specialist is advised.""",
            False,
        )
    elif tumor_percentage < 5.0:
        return (
            f"""The AI segmentation model detected
a distinct abnormal mass region
within the MRI scan.

The estimated tumor coverage is
approximately {tumor_percentage:.2f}%,
which is categorized as medium
severity.

The prediction confidence is
{confidence:.1f}%,
indicating a strong likelihood
of abnormal tissue presence.

Immediate specialist consultation,
advanced contrast MRI or CT imaging,
and biopsy consideration
are strongly recommended.

Further clinical interpretation
by a medical specialist is advised.""",
            False,
        )
    else:
        return (
            f"""The AI segmentation model detected
a large abnormal region
within the MRI scan.

The estimated tumor coverage is
approximately {tumor_percentage:.2f}%,
which is categorized as high
severity.

The prediction confidence is
{confidence:.1f}%,
indicating a very strong likelihood
of significant abnormal tissue.

Urgent multidisciplinary oncology
review, contrast-enhanced imaging,
and immediate clinical intervention
are strongly advised.

Further clinical interpretation
by a medical specialist is advised.""",
            False,
        )


@app.get("/health")
def health():
    return {
        "status":       "online",
        "esrgan":       esrgan_model    is not None,
        "unet":         unet_model      is not None,
        "llm":          openrouter_client is not None,
        "llm_provider": "OpenRouter" if openrouter_client else "rule-based",
        "device":       str(DEVICE),
    }


@app.get("/")
def read_root():
    return {
        "status":  "Online",
        "message": "NeuroScan AI Backend is running. Open http://localhost:5173 for the UI.",
        "llm":     openrouter_client is not None,
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    start_time = time.time()

    # ── Read image ──────────────────────────────────────────────────────────
    contents = await file.read()
    nparr    = np.frombuffer(contents, np.uint8)
    original_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if original_img is None:
        from fastapi import HTTPException
        raise HTTPException(400, "Invalid image file")

    # ── ESRGAN enhancement ──────────────────────────────────────────────────
    enhanced_img = enhance_image(original_img, esrgan_model, DEVICE)

    # ── U-Net++ segmentation ────────────────────────────────────────────────
    mask_prob = predict_mask(enhanced_img, unet_model, DEVICE)

    # ── Threshold ───────────────────────────────────────────────────────────
    binary_mask = (mask_prob > 0.5).astype(np.uint8)
    mask_visual = (binary_mask * 255).astype(np.uint8)

    # ── Metrics ─────────────────────────────────────────────────────────────
    total_pixels     = binary_mask.shape[0] * binary_mask.shape[1]
    tumor_pixels     = int(np.sum(binary_mask))
    tumor_percentage = float(tumor_pixels / total_pixels) * 100
    tumor_detected   = tumor_percentage > 0.05

    if tumor_detected and tumor_pixels > 0:
        confidence = float(np.mean(mask_prob[binary_mask == 1])) * 100
    else:
        confidence = float(np.max(mask_prob)) * 100

    # ── Severity / risk ─────────────────────────────────────────────────────
    if not tumor_detected:
        severity, risk = "None", "No Risk"
    elif tumor_percentage < 1.0:
        severity, risk = "Small", "Low Risk"
    elif tumor_percentage < 5.0:
        severity, risk = "Medium", "Moderate Risk"
    else:
        severity, risk = "Large", "High Risk"

    # ── Build output images (needed for vision LLM) ──────────────────────
    bbox_img    = enhanced_img.copy()
    overlay_img = enhanced_img.copy()

    colored_mask = np.zeros_like(enhanced_img)
    colored_mask[binary_mask == 1] = [0, 0, 255]
    overlay_img = cv2.addWeighted(overlay_img, 0.7, colored_mask, 0.3, 0)

    contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if tumor_detected and contours:
        c = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(c)
        cv2.rectangle(bbox_img, (x, y), (x + w, y + h), (0, 200, 255), 2)
        cv2.putText(bbox_img, "Tumor", (x, y - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.85, (0, 200, 255), 2)

    # ── LLM insight (Gemini Vision or fallback) ───────────────────────────
    insight, image_insight_powered = generate_llm_insight(
        tumor_detected, confidence, tumor_percentage, severity, risk,
        overlay_img=overlay_img,
        bbox_img=bbox_img,
        mask_img=mask_visual,
    )

    # ── (overlay & bbox already built above for vision LLM) ─────────────────

    processing_time = round(time.time() - start_time, 2)

    return {
        "tumor_detected":         bool(tumor_detected),
        "confidence":             round(confidence, 2),
        "tumor_percentage":       round(tumor_percentage, 2),
        "severity":               severity,
        "risk_assessment":        risk,
        "processing_time":        processing_time,
        "insight":                insight,
        "llm_powered":            openrouter_client is not None,
        "image_insight_powered":  image_insight_powered,
        "original_b64":  f"data:image/png;base64,{image_to_base64(original_img)}",
        "enhanced_b64":  f"data:image/png;base64,{image_to_base64(enhanced_img)}",
        "mask_b64":      f"data:image/png;base64,{image_to_base64(cv2.cvtColor(mask_visual, cv2.COLOR_GRAY2BGR))}",
        "bbox_b64":      f"data:image/png;base64,{image_to_base64(bbox_img)}",
        "overlay_b64":   f"data:image/png;base64,{image_to_base64(overlay_img)}",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)