import os
import subprocess
from google import genai
from google.genai import types
from google.oauth2.credentials import Credentials

# Helper to dynamically get auth credentials and project from the active gcloud account
def get_genai_client():
    project_id = os.environ.get("PROJECT_ID") or os.environ.get("GCP_PROJECT") or os.environ.get("GCLOUD_PROJECT")
    location = os.environ.get("LOCATION") or os.environ.get("GCP_LOCATION") or "us-central1"
    credentials = None
    
    try:
        # Fetch fresh token from active gcloud user account
        token = subprocess.check_output(["gcloud", "auth", "print-access-token"], text=True).strip()
        credentials = Credentials(token=token)
    except Exception as e:
        # Log error securely without exposing credentials details
        print("[Security Check] Failed to resolve gcloud token. Fallback to default credentials.")
        
    if not project_id:
        try:
            # Fetch active project from local gcloud configuration dynamically
            project_id = subprocess.check_output(["gcloud", "config", "get-value", "project"], text=True).strip()
        except Exception:
            pass
            
    # Secure fallback if resolving fails
    if not project_id:
        project_id = "ninghai-srtt"
        
    print(f"[API Setup] Initializing GenAI Client for project: {project_id} in region: {location}", flush=True)
    
    # Standard GenAI Client initialization in Vertex AI mode
    return genai.Client(
        vertexai=True,
        project=project_id,
        location=location,
        credentials=credentials
    )

def run_upscale(image_path: str, model: str, scale_factor: str) -> tuple[bytes, str]:
    """
    Executes upscaling of an image file using the specified Imagen model via Vertex AI.
    Returns a tuple of (upscaled_image_bytes, mime_type).
    """
    client = get_genai_client()
    
    response = client.models.upscale_image(
        model=model,
        image=types.Image.from_file(location=image_path),
        upscale_factor=scale_factor
    )
    
    # Extract the upscaled image bytes
    output_image_obj = response.generated_images[0].image
    if not output_image_obj or not output_image_obj.image_bytes:
        raise Exception("Model returned an empty image or missing bytes.")
        
    upscaled_bytes = output_image_obj.image_bytes
    mime_type = output_image_obj.mime_type or "image/png"
    
    return upscaled_bytes, mime_type
