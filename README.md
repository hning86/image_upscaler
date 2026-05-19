# Imagen Ultra Upscaler

A premium, secure single-page web application built with FastAPI and Vanilla CSS/JS to enhance and upscale images using the Vertex AI **Imagen 4.0 Upscale Preview** and **Imagen 3.0 Generate** models via the Google GenAI SDK.

---

## Key Features

- **Premium Glassmorphism UI**: Designed with high-end dark aesthetics, Outfit typography, custom grid layouts, subtle gradients, and micro-animations.
- **Interactive Slider**: Real-time, draggable before/after comparison slider for inspecting enhanced image details side-by-side.
- **Flexible Models**: Supports upscaling via the state-of-the-art `imagen-4.0-upscale-preview` (best quality) and `imagen-3.0-generate-002` (balanced performance).
- **Resolution Scaling**: Offers double ($2\times$) and quadruple ($4\times$) resolution upscaling.
- **Production-Ready Security**:
  - **Strict File Sanitization**: Restricts uploaded formats exclusively to JPG, JPEG, and PNG.
  - **Magic Byte Verification**: Inspects image structure via Pillow's integrity checks before sending payloads to Vertex AI APIs.
  - **Size Restrictions**: Enforces a maximum limit of 10MB on uploaded images.
  - **Automatic Cleanup**: Deletes intermediate files immediately after processing or upon server error.
  - **Local CORS Protections**: Restricts requests to local host origin to guard against cross-site scripting issues.

---

## Architecture & Directory Layout

```text
.
├── .env                   # Local environment configuration
├── README.md              # Project documentation (this file)
├── pyproject.toml         # Package configuration and dependencies
├── test_upscale.py        # Standalone test script for direct API calls
└── app
    ├── __init__.py
    ├── main.py            # FastAPI Backend (Routes, validations, & Vertex AI client)
    ├── static/
    │   ├── index.html     # Single-page dashboard markup
    │   ├── styles.css     # Tailored HSL styles, glassmorphism, custom widgets
    │   └── app.js         # Frontend logic, slider behavior, & base64 conversions
    └── temp_uploads/      # Sandboxed directory for secure temporary file staging
```

---

## Tech Stack

- **Language**: Python 3.13+
- **Backend**: FastAPI, Uvicorn
- **AI Integration**: Google GenAI SDK (`google-genai`), Vertex AI API
- **Image Processing**: Pillow (PIL)
- **Frontend**: Vanilla HTML5, CSS3, & Modern ES6 Javascript

---

## Prerequisites & Authentication

The application utilizes the **Vertex AI API** which requires authentication. Before running, ensure you have:
1. **gcloud CLI installed** and initialized.
2. Active credentials configured. Authenticate your local system:
   ```bash
   gcloud auth application-default login
   ```
   *Note: The backend automatically attempts to fetch credentials via `gcloud auth print-access-token` as a robust fallback.*

3. Configure your `.env` file with your Google Cloud credentials if required.

---

## Quick Start

Follow these steps to run the application locally. This project uses `uv` for efficient Python package management.

### 1. Install Dependencies
First, ensure you have `uv` installed. Then, run the following command to install the package dependencies:
```bash
uv sync
```

### 2. Run the Server
Launch the FastAPI backend with Uvicorn:
```bash
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. View in Browser
Once Uvicorn starts successfully, open your browser and navigate to:
[http://127.0.0.1:8000](http://127.0.0.1:8000)

---

## Standalone Command Line Testing

A helper script, `test_upscale.py`, is included to verify your Google GenAI API connectivity and upscaling capability independently of the FastAPI server.

Run the script using:
```bash
uv run test_upscale.py
```

**What it does:**
1. Generates a dummy `test_input.png` image containing a blue circle.
2. Resolves authorization tokens securely using the local `gcloud` environment.
3. Sends the image to Vertex AI for a $2\times$ upscale enhancement.
4. Saves the returned upscale artifact as `test_output.png`.
5. Fallbacks to `imagen-3.0-generate-002` automatically if permissions for the preview model are restricted.
