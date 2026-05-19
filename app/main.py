import os
import uuid
import subprocess
import shutil
from dotenv import load_dotenv

# Load local environment variables from .env file
load_dotenv(override=True)
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from app.upscaler import run_upscale
import io
import base64

app = FastAPI(
    title="Imagen Image Upscaler API",
    description="Secure API to upscale images using Gemini's Imagen model via Vertex AI"
)

# Allow list of acceptable mime types and extensions
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}
ALLOWED_MIME_TYPES = {"image/png", "image/jpeg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Secure temporary uploads directory inside the project workspace
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "temp_uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Configure CORS - Restrict to localhost for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)



@app.post("/api/upscale")
async def upscale_image(
    image: UploadFile = File(...),
    scale: str = Form(...),
    model: str = Form(...)
):
    # 1. Input Validation - Scale
    if scale not in {"x2", "x4"}:
        raise HTTPException(status_code=400, detail="Invalid scale factor. Choose 'x2' or 'x4'.")
        
    # 2. Input Validation - Model Allow-list
    if model not in {"imagen-4.0-upscale-preview", "imagen-3.0-generate-002"}:
        raise HTTPException(status_code=400, detail="Unsupported upscaling model.")

    # 3. Input Validation - File Extension
    filename_ext = os.path.splitext(image.filename)[1].lower()
    if filename_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file extension. Only PNG, JPG, and JPEG are allowed.")
        
    # 4. Input Validation - MIME Type
    if image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PNG and JPEG images are allowed.")

    # 5. Secure Filename Generation (Prevent Traversal)
    safe_filename = f"{uuid.uuid4()}{filename_ext}"
    input_file_path = os.path.join(UPLOAD_DIR, safe_filename)

    # 6. File Size Validation & Writing to Disk
    try:
        file_size = 0
        with open(input_file_path, "wb") as buffer:
            while chunk := await image.read(1024 * 64):
                file_size += len(chunk)
                if file_size > MAX_FILE_SIZE:
                    buffer.close()
                    # Remove partial file safely
                    if os.path.exists(input_file_path):
                        os.remove(input_file_path)
                    raise HTTPException(status_code=400, detail="File size exceeds the 10MB limit.")
                buffer.write(chunk)
    except Exception as e:
        if not isinstance(e, HTTPException):
            # Clean up on system write error
            if os.path.exists(input_file_path):
                os.remove(input_file_path)
            raise HTTPException(status_code=500, detail="Error processing uploaded file.")
        raise e

    # 7. Image Validation - Magic Bytes / Integrity check using Pillow
    try:
        with Image.open(input_file_path) as img:
            img.verify()  # Verify image structure/magic bytes
        # Re-open to inspect dimensions
        with Image.open(input_file_path) as img:
            input_width, input_height = img.size
    except Exception:
        if os.path.exists(input_file_path):
            os.remove(input_file_path)
        raise HTTPException(status_code=400, detail="Invalid image file structure or corrupted content.")

    # 8. Call upscaler service
    try:
        print(f"Upscaling image: {safe_filename} using {model} scale: {scale}...", flush=True)
        upscaled_bytes, mime_type = run_upscale(
            image_path=input_file_path,
            model=model,
            scale_factor=scale
        )
        
        # Load Pillow image to verify dimensions and structure
        with Image.open(io.BytesIO(upscaled_bytes)) as up_img:
            output_width, output_height = up_img.size
            
        # Convert upscaled image to base64 data URL
        base64_data = base64.b64encode(upscaled_bytes).decode("utf-8")
        data_url = f"data:{mime_type};base64,{base64_data}"
        
        return JSONResponse({
            "status": "success",
            "original_dimensions": f"{input_width}x{input_height}",
            "upscaled_dimensions": f"{output_width}x{output_height}",
            "upscaled_image_url": data_url
        })
        
    except Exception as e:
        err_msg = str(e)
        print(f"[API Error] Upscaling failed: {err_msg}")
        
        # 1. Check for pixel limit error
        if "Only support upscaling images up to" in err_msg:
            friendly_msg = (
                "The upscaled image exceeds Vertex AI's maximum size limit of 17,000,000 pixels. "
                "Try reducing the upscale factor (e.g., choose 2x instead of 4x) or upload a smaller source image."
            )
            raise HTTPException(status_code=400, detail=friendly_msg)
            
        # 2. Check for IAM permission issues
        elif "PERMISSION_DENIED" in err_msg or "aiplatform.endpoints.predict" in err_msg:
            friendly_msg = (
                "Vertex AI prediction permission denied. Please ensure the active Google Cloud project "
                "is authorized and has the Vertex AI User role enabled."
            )
            raise HTTPException(status_code=403, detail=friendly_msg)
            
        # 3. Generic fallback
        raise HTTPException(status_code=500, detail="Upscaling model failed to process the image.")
        
    finally:
        # 9. Clean up upload file immediately to preserve privacy & system storage
        if os.path.exists(input_file_path):
            try:
                os.remove(input_file_path)
            except Exception:
                pass

# Serve Static Frontend Web Pages
app.mount("/", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static"), html=True), name="static")
