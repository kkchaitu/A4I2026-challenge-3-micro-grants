#!/usr/bin/env bash
set -u

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

INTERVAL_SECONDS=30

echo "============================================================"
echo "👀 Auto-Deploy Watcher Started"
echo "📁 Repository: $REPO_DIR"
echo "🌿 Branch:     main"
echo "⏱️  Poll Rate:  Every ${INTERVAL_SECONDS}s"
echo "============================================================"

# Ensure on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "⚠️ Warning: Currently on branch '$CURRENT_BRANCH', switching to 'main'..."
  git checkout main
fi

while true; do
  git fetch origin main --quiet 2>/dev/null || true
  LOCAL_COMMIT=$(git rev-parse HEAD)
  REMOTE_COMMIT=$(git rev-parse origin/main)

  if [[ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]]; then
    echo ""
    echo "🔔 [$(date -u +'%Y-%m-%d %H:%M:%SZ')] New commits detected on origin/main!"
    echo "   Current: $LOCAL_COMMIT"
    echo "   Latest:  $REMOTE_COMMIT"

    echo "📥 Pulling latest changes..."
    if git pull --ff-only origin main; then
      echo "🚀 Triggering ./deploy.sh..."
      if ./deploy.sh; then
        echo "✅ [$(date -u +'%Y-%m-%d %H:%M:%SZ')] Deployment completed successfully!"
      else
        echo "❌ [$(date -u +'%Y-%m-%d %H:%M:%SZ')] Deployment encountered an error."
      fi
    else
      echo "⚠️ Git pull failed. Please check for local merge conflicts."
    fi
    echo "👀 Resuming watch..."
  fi

  sleep "$INTERVAL_SECONDS"
done
