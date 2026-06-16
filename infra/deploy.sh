#!/bin/sh
# Run ON THE VPS from the repo root: ./infra/deploy.sh
# Fast path (default when USE_PREBUILT_WEB_IMAGE=true): pull GHCR image + restart (~30s).
# Slow path: docker build on VPS (~3–5 min). Set USE_PREBUILT_WEB_IMAGE=false in infra/.env.
set -e
cd "$(dirname "$0")/.."
REPO=$(pwd)
# Discard local changes in infra/ so pull never fails (chmod, edits, etc.)
git checkout -- infra/ 2>/dev/null || true
echo "Pulling latest from origin/main..."
git pull origin main --no-edit
chmod +x infra/deploy.sh infra/status.sh 2>/dev/null || true
[ -f .env ] || touch .env
smtp_user_ok=false
smtp_pass_ok=false
grep -qE '^SMTP_USER=.+$' infra/.env 2>/dev/null && smtp_user_ok=true
grep -qE '^SMTP_USER=.+$' .env 2>/dev/null && smtp_user_ok=true
grep -qE '^SMTP_PASSWORD=.+$' infra/.env 2>/dev/null && smtp_pass_ok=true
grep -qE '^SMTP_PASSWORD=.+$' .env 2>/dev/null && smtp_pass_ok=true
if [ "$smtp_user_ok" != true ] || [ "$smtp_pass_ok" != true ]; then
  echo "WARN: No non-empty SMTP_USER / SMTP_PASSWORD found in infra/.env or repo-root .env — team invites cannot send until both are set (see infra/.env.example)."
fi

COMPOSE="docker compose --project-directory $REPO/infra --env-file $REPO/infra/.env -f $REPO/infra/docker-compose.yml"

# Load deploy mode from infra/.env (docker compose also reads these for image: tag)
USE_PREBUILT=false
if grep -qE '^USE_PREBUILT_WEB_IMAGE=true' infra/.env 2>/dev/null; then
  USE_PREBUILT=true
fi

if [ "$USE_PREBUILT" = true ]; then
  WEB_IMAGE=$(grep -E '^WEB_IMAGE=' infra/.env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
  WEB_IMAGE_TAG=$(grep -E '^WEB_IMAGE_TAG=' infra/.env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
  WEB_IMAGE="${WEB_IMAGE:-ghcr.io/vmainc/web-ranking-reports/web}"
  WEB_IMAGE_TAG="${WEB_IMAGE_TAG:-main}"
  export WEB_IMAGE WEB_IMAGE_TAG USE_PREBUILT_WEB_IMAGE=true
  echo "Fast deploy: pulling $WEB_IMAGE:$WEB_IMAGE_TAG (no VPS build)..."
  $COMPOSE pull web
  $COMPOSE up -d --no-build --force-recreate web
else
  echo "Slow deploy: building web image on VPS (3–5 min)..."
  echo "Tip: enable USE_PREBUILT_WEB_IMAGE=true in infra/.env after GHCR setup (see docs/FAST_DEPLOY.md)."
  $COMPOSE up -d --build --force-recreate web
fi

echo "Watch logs: $COMPOSE logs -f web"
