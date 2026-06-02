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
UNET_PATH   = str(BASE_DIR / "models" / "best_unetplusplus_v2.pth")

# ── Load models at startup ─────────────────────────────────────────────────
esrgan_model = load_esrgan(ESRGAN_PATH, DEVICE)
unet_model   = load_unet(UNET_PATH, DEVICE)

# ── OpenRouter LLM setup ──────────────────────────────────────────────────
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_VISION_MODEL = "google/gemini-flash-1.5"   # vision-capable
OPENROUTER_TEXT_MODEL   = "google/gemini-flash-1.5"   # text-only fallback

openrouter_client = None
if OPENROUTER_API_KEY:
    try:
        from openai import OpenAI
        openrouter_client = OpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url=OPENROUTER_BASE_URL,
        )
        logger.info("✓ OpenRouter LLM client ready (model: %s)", OPENROUTER_VISION_MODEL)
    except Exception as e:
        logger.warning(f"Failed to initialize OpenAI client: {e} — LLM insights will use rule-based fallback")
else:
    logger.info("OPENROUTER_API_KEY not found in environment — LLM insights will use rule-based fallback")


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

Using BOTH the visual findings (tumor overlay boundary, bounding box) AND the quantitative metrics, write a highly professional, detailed, and structured Clinical Diagnostic Report.
Format the response in clean Markdown with distinct sections. Do NOT use artificial short-line wrapping; write in natural, full-width sentences.

Your output must follow this format:
### 1. Diagnostic Summary
Write a professional summary explaining whether abnormal tissue has been detected, the overall confidence level, and the risk classification.

### 2. Quantitative & Visual Findings
- **Tumor Boundary & Mask**: Describe the visual evidence from the segmentation mask. Mention that the tumor area coverage is **{tumor_percentage:.2f}%** and the model's confidence is **{confidence:.1f}%**.
- **Spatial Localization**: Describe the presence and positioning of the tumor bounding box if detected.
- **Classification & Severity**: Elaborate on the **{severity}** severity grading and the associated **{risk}** level.

### 3. Clinical Recommendations & Next Steps
Provide a bulleted list of appropriate recommendations based on the findings (e.g., contrast-enhanced MRI scan, follow-up, radiological review, or immediate oncology consult).

### 4. Disclaimer
Include a standard professional medical AI warning.

Be precise, clinical, and objective. Output ONLY the markdown report text."""

        content.append({"type": "text", "text": vision_prompt})

        # ── Try vision call first ─────────────────────────────────────────
        if image_parts_count > 0:
            try:
                resp = openrouter_client.chat.completions.create(
                    model=OPENROUTER_VISION_MODEL,
                    messages=[{"role": "user", "content": content}],
                    max_tokens=768,
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

Construct a highly professional, detailed, and structured Clinical Diagnostic Report based on these metrics.
Format the response in clean Markdown with distinct sections. Do NOT use artificial short-line wrapping; write in natural, full-width sentences.

Your output must follow this format:
### 1. Diagnostic Summary
Write a professional summary explaining whether abnormal tissue has been detected, the overall confidence level, and the risk classification.

### 2. Quantitative & Visual Findings
- **Tumor Boundary & Mask**: Mention the tumor area coverage of **{tumor_percentage:.2f}%** and the model's confidence of **{confidence:.1f}%**.
- **Classification & Severity**: Elaborate on the **{severity}** severity grading and the associated **{risk}** level.

### 3. Clinical Recommendations & Next Steps
Provide a bulleted list of appropriate clinical recommendations.

### 4. Disclaimer
Include a standard professional medical AI warning.

Be precise, clinical, and objective. Output ONLY the markdown report text."""
            resp = openrouter_client.chat.completions.create(
                model=OPENROUTER_TEXT_MODEL,
                messages=[{"role": "user", "content": text_prompt}],
                max_tokens=768,
                temperature=0.3,
            )
            return resp.choices[0].message.content.strip(), False
        except Exception as e:
            logger.warning(f"OpenRouter text error: {e} — using rule-based fallback")

    # ── Rule-based GPT-style fallback ────────────────────────────────────────────────
    if not tumor_detected:
        return (
            f"""### 1. Diagnostic Summary
The AI segmentation pipeline has completed its analysis of the uploaded MRI scan. **No significant abnormal tissue regions or tumor patterns were detected** within the scan volume.

### 2. Quantitative & Visual Findings
- **Tumor Area Coverage**: The estimated abnormal tissue coverage is **0.00%** (below the clinical detection threshold of 0.05%).
- **AI Confidence Level**: The pipeline reports a confidence score of **{confidence:.1f}%**, indicating a very high likelihood of normal structural patterns.
- **Severity & Risk Assessment**: Classified as **No Severity (None)** with **No Risk** indicated.

### 3. Clinical Recommendations & Next Steps
- **Routine Monitoring**: Standard clinical follow-up as per standard protocol.
- **Clinical Correlation**: Please correlate these findings with the patient's history and symptoms.
- **Radiologist Review**: A standard radiologist review is recommended to confirm structural integrity.

### 4. Disclaimer
*This report is generated by an automated AI pipeline and is intended for clinical assistance only. Final diagnoses must be made by qualified medical specialists.*""",
            False,
        )
    elif tumor_percentage < 1.0:
        return (
            f"""### 1. Diagnostic Summary
The AI segmentation pipeline has detected a **small abnormal region** within the MRI scan. The overall risk profile is classified as **Low Risk**.

### 2. Quantitative & Visual Findings
- **Tumor Area Coverage**: The abnormal region covers approximately **{tumor_percentage:.2f}%** of the scan area.
- **AI Confidence Level**: The pipeline reports a confidence score of **{confidence:.1f}%**, indicating a moderate probability of abnormal tissue presence.
- **Severity & Risk Assessment**: Classified as **Small** severity with **Low Risk** parameters.

### 3. Clinical Recommendations & Next Steps
- **Specialist Consultation**: Schedule a routine evaluation with a neuro-oncology specialist.
- **Advanced Imaging**: Consider a follow-up high-resolution contrast-enhanced MRI in 3–6 months to monitor any changes.
- **Symptomatic Correlation**: Evaluate clinical symptoms to check for neurological correlates.

### 4. Disclaimer
*This report is generated by an automated AI pipeline and is intended for clinical assistance only. Final diagnoses must be made by qualified medical specialists.*""",
            False,
        )
    elif tumor_percentage < 5.0:
        return (
            f"""### 1. Diagnostic Summary
The AI segmentation pipeline has identified a **distinct abnormal mass region** within the MRI scan. The overall risk profile is classified as **Moderate Risk**, requiring formal radiological review.

### 2. Quantitative & Visual Findings
- **Tumor Area Coverage**: The predicted tumor mass covers approximately **{tumor_percentage:.2f}%** of the scan area.
- **AI Confidence Level**: The pipeline reports a confidence score of **{confidence:.1f}%**, indicating a strong probability of abnormal tissue presence.
- **Severity & Risk Assessment**: Classified as **Medium** severity with **Moderate Risk** parameters.

### 3. Clinical Recommendations & Next Steps
- **Urgent Specialist Consultation**: Refer to a neurosurgeon or neuro-oncologist for detailed review.
- **Contrast-Enhanced Scan**: Perform a gadolinium-enhanced MRI to better define structural boundaries.
- **Biopsy Consideration**: A stereotactic biopsy may be discussed if clinically indicated to determine pathology.

### 4. Disclaimer
*This report is generated by an automated AI pipeline and is intended for clinical assistance only. Final diagnoses must be made by qualified medical specialists.*""",
            False,
        )
    else:
        return (
            f"""### 1. Diagnostic Summary
The AI segmentation pipeline has detected a **large abnormal region** within the MRI scan. The overall risk profile is classified as **High Risk**, indicating an urgent need for clinical correlation and intervention.

### 2. Quantitative & Visual Findings
- **Tumor Area Coverage**: The predicted tumor mass covers **{tumor_percentage:.2f}%** of the scan area, representing a significant volume.
- **AI Confidence Level**: The pipeline reports a confidence score of **{confidence:.1f}%**, indicating a very high probability of abnormal tissue.
- **Severity & Risk Assessment**: Classified as **Large** severity with **High Risk** parameters.

### 3. Clinical Recommendations & Next Steps
- **Urgent Multidisciplinary Review**: Immediate referral to a neuro-oncology multidisciplinary team (MDT).
- **Comprehensive Diagnostic Workup**: Complete high-resolution MRI protocol (including contrast, perfusion, and spectroscopy).
- **Intervention Planning**: Initiate planning for surgical resection, radiotherapy, or chemotherapy as appropriate.

### 4. Disclaimer
*This report is generated by an automated AI pipeline and is intended for clinical assistance only. Final diagnoses must be made by qualified medical specialists.*""",
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
def predict(file: UploadFile = File(...)):
    start_time = time.time()

    # ── Read image ──────────────────────────────────────────────────────────
    contents = file.file.read()
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