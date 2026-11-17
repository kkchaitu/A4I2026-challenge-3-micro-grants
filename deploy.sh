#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "🚀 Deploying 'my-agent' to Google Cloud Run"
echo "============================================================"

# Resolve repo root directory
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

# Detect current Google Cloud project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
if [[ -z "$PROJECT_ID" ]]; then
  echo "❌ Error: No active GCP project found. Run 'gcloud config set project <PROJECT_ID>'."
  exit 1
fi

REGION="us-central1"
SERVICE_NAME="my-agent"

echo "📦 Project:      $PROJECT_ID"
echo "📍 Region:       $REGION"
echo "⚙️  Service:      $SERVICE_NAME"
echo "📁 Source Path:  $REPO_ROOT/my-agent"
echo "------------------------------------------------------------"
echo "🔨 Building React frontend..."
(cd "$REPO_ROOT/front-end" && npm install && npm run build)
mkdir -p "$REPO_ROOT/my-agent/app/static/react_dist"
cp -r "$REPO_ROOT/front-end/dist/"* "$REPO_ROOT/my-agent/app/static/react_dist/"
echo "✅ React build packaged into my-agent/app/static/react_dist"
echo ""
echo "Building container and deploying... (takes ~1-2 minutes)"
echo ""

# Deploy to Cloud Run from source
gcloud run deploy "$SERVICE_NAME" \
  --source="$REPO_ROOT/my-agent" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_GENAI_USE_ENTERPRISE=true,GOOGLE_CLOUD_LOCATION=global,GOOGLE_CLOUD_PROJECT=$PROJECT_ID" \
  --memory=4Gi \
  --cpu=1 \
  --min-instances=1 \
  --max-instances=10 \
  --concurrency=8 \
  --labels="created-by=agent-starter-pack"

echo ""
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format="value(status.url)")

echo "============================================================"
echo "✅ Deployment Successful!"
echo "🌐 Combined React App:      $SERVICE_URL"
echo "🎮 Grant Officer Dashboard: $SERVICE_URL/dashboard"
echo "⚙️  ADK Dev Playground:     $SERVICE_URL/dev-ui/?app=app"
echo "============================================================"
