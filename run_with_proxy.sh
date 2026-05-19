#!/bin/bash
set -e

# 1. Default variables
SERVICE_NAME="imagen-upscaler"
REGION=${GCP_REGION:-"us-central1"}

# 2. Fetch active project to ensure user is authenticated
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
  echo "Error: No active Google Cloud project config found."
  echo "Please login and set your target project: "
  echo "  gcloud auth login"
  echo "  gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

echo "===================================================="
echo "Starting Secure Local Tunnel Proxy to Cloud Run"
echo "Project ID : $PROJECT_ID"
echo "Service    : $SERVICE_NAME"
echo "Region     : $REGION"
echo "===================================================="
echo "This establishes a secure local proxy on port 8080."
echo "Your active local gcloud tokens will be automatically injected."
echo "Open your browser at:"
echo "  http://localhost:8080"
echo "===================================================="
echo "Press Ctrl+C to stop the proxy tunnel."
echo "===================================================="

# Execute gcloud proxy command
exec gcloud run services proxy "$SERVICE_NAME" --region="$REGION"
