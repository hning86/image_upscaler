import os
import subprocess
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.oauth2.credentials import Credentials
from PIL import Image

# Load environment
load_dotenv()

# Create a simple dummy image of a blue circle to test upscaling
print("Creating dummy image...")
img = Image.new('RGB', (128, 128), color='white')
from PIL import ImageDraw
draw = ImageDraw.Draw(img)
draw.ellipse((32, 32, 96, 96), fill='blue')
img_path = "test_input.png"
img.save(img_path)
print(f"Dummy image saved to {img_path}")

# Programmatically fetch access token from gcloud command line
try:
    print("Fetching access token from gcloud...")
    token = subprocess.check_output(["gcloud", "auth", "print-access-token"], text=True).strip()
    credentials = Credentials(token=token)
    print("Successfully created Credentials from token.")
except Exception as e:
    print("Failed to fetch access token from gcloud:", e)
    credentials = None

# Initialize Client using the Credentials and project ninghai-srtt
print("Initializing Client with vertexai=True and project ninghai-srtt...")
client = genai.Client(
    vertexai=True,
    project="ninghai-srtt",
    location="us-central1",
    credentials=credentials
)

try:
    print("Requesting upscale using imagen-4.0-upscale-preview...")
    response = client.models.upscale_image(
        model='imagen-4.0-upscale-preview',
        image=types.Image.from_file(location=img_path),
        upscale_factor='x2'
    )
    
    # Save output
    output_image = response.generated_images[0].image
    output_path = "test_output.png"
    output_image.save(output_path)
    print(f"Success! Upscaled image saved to {output_path}")
    print(f"Upscaled image size: {output_image.size}")
except Exception as e:
    print("Failed to upscale with imagen-4.0-upscale-preview:", e)
    print("Trying fallback to imagen-3.0-generate-002...")
    try:
        response = client.models.upscale_image(
            model='imagen-3.0-generate-002',
            image=types.Image.from_file(location=img_path),
            upscale_factor='x2'
        )
        output_image = response.generated_images[0].image
        output_path = "test_output_fallback.png"
        output_image.save(output_path)
        print(f"Success with fallback! Upscaled image saved to {output_path}")
        print(f"Upscaled image size: {output_image.size}")
    except Exception as fallback_err:
        print("Fallback also failed:", fallback_err)
