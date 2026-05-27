# NeuroScan AI: Automated MRI Brain Tumor Detection System

NeuroScan AI is a dual-model, full-stack medical imaging analysis pipeline. It utilizes **ESRGAN (Enhanced Super-Resolution Generative Adversarial Networks)** to upscale raw low-resolution MRI scans, followed by a **U-Net++ Segmentation Network** to isolate and outline brain tumors with pixel-level precision.

---

## 🌟 Key Features

*   **4× Image Super-Resolution (ESRGAN)**: Enhances scan clarity and texture details to aid U-Net++ prediction.
*   **Pixel-Level Tumor Segmentation (U-Net++)**: Precise outline extraction with confidence mapping.
*   **Clinical Insights (LLM Powered)**: Communicates with OpenRouter (Gemini Vision Flash 1.5) to provide professional radiological structured insights and recommendations.
*   **Interactive Visualizer Overlay**: Allows toggling between Original, Enhanced, Segmented Mask, Bounding Box, and blended Mask Overlay views.

---

## 🛠️ Technology Stack

### Backend
*   **Core Framework**: FastAPI (Python)
*   **AI/Deep Learning**: PyTorch, Torchvision, Segmentation Models PyTorch (SMP)
*   **Computer Vision**: OpenCV, NumPy, Pillow
*   **LLM API**: OpenAI SDK (pointing to OpenRouter AI)

### Frontend
*   **Core Framework**: React (Vite, Javascript)
*   **Styling**: Vanilla CSS + Tailwind CSS v4 (Glassmorphism & animations)
*   **Animations**: Framer Motion, AnimeJS
*   **Charting & Visualization**: Chart.js, React ChartJS 2

---

## 🚀 Setup & Running Instructions

### Prerequisites
*   Python 3.11+
*   Node.js 18+
*   Git

---

### 1. Backend Setup & Run

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Verify models can load successfully:
   ```bash
   python test_models.py
   ```
5. Run the FastAPI development server:
   ```bash
   python app.py
   ```
   *The backend will start at:* `http://127.0.0.1:8000`

---

### 2. Frontend Setup & Run

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will start at:* `http://localhost:5173/`

---

## 📋 API Endpoints

*   `GET /`: Returns basic health status.
*   `GET /health`: Detailed status check of loaded models and LLM connectivity.
*   `POST /predict`: Accepts an MRI image file (`multipart/form-data`) and returns upscaled, segmented, and overlay base64 images along with tumor percentage area, bounding box coordinates, and AI-generated radiological insights.

---

## 🔒 Research Disclaimer
*This system is developed for clinical research and educational purposes only. It is not a substitute for professional medical diagnosis or consultation.*
