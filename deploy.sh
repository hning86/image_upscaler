#!/bin/bash
set -e

# Resolve Google Cloud Project ID from active config if not pre-set
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
REGION=${GCP_REGION:-"us-central1"}

if [ -z "$PROJECT_ID" ]; then
  echo "Error: No active Google Cloud project found. Please run 'gcloud config set project PROJECT_ID' first."
  exit 1
fi

SERVICE_NAME="imagen-upscaler"
REPO_NAME="imagen-upscaler-repo"
IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"

echo "===================================================="
echo "Deploying $SERVICE_NAME to Google Cloud Run"
echo "Project ID : $PROJECT_ID"
echo "Region     : $REGION"
echo "Repository : $REPO_NAME"
echo "Image Tag  : $IMAGE_TAG"
echo "===================================================="

# 1. Ensure Artifact Registry repository exists
echo "Step 1: Checking if Artifact Registry Docker repository exists..."
if ! gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" >/dev/null 2>&1; then
  echo "Creating Artifact Registry Docker repository '$REPO_NAME' in region '$REGION'..."
  gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Docker repository for Image Upscaler app"
else
  echo "Repository '$REPO_NAME' already exists."
fi

# 2. Build container image using Cloud Build
echo "Step 2: Building container image using Google Cloud Build..."
gcloud builds submit --tag "$IMAGE_TAG" .

# 3. Deploy to Cloud Run
echo "Step 3: Deploying container image to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_TAG" \
  --platform managed \
  --region "$REGION" \
  --set-env-vars PROJECT_ID="$PROJECT_ID",LOCATION="$REGION" \
  --no-allow-unauthenticated

echo "===================================================="
echo "Deployment successfully completed!"
echo "===================================================="
