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
IMAGE_TAG="gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"

echo "===================================================="
echo "Deploying $SERVICE_NAME to Google Cloud Run"
echo "Project ID : $PROJECT_ID"
echo "Region     : $REGION"
echo "Image Tag  : $IMAGE_TAG"
echo "===================================================="

# 1. Build container image using Cloud Build
echo "Step 1: Building container image using Google Cloud Build..."
gcloud builds submit --tag "$IMAGE_TAG" .

# 2. Deploy to Cloud Run
echo "Step 2: Deploying container image to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_TAG" \
  --platform managed \
  --region "$REGION" \
  --set-env-vars PROJECT_ID="$PROJECT_ID",LOCATION="$REGION" \
  --allow-unauthenticated

echo "===================================================="
echo "Deployment successfully completed!"
echo "===================================================="
