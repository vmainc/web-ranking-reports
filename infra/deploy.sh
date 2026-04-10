#!/bin/sh
# Run this ON THE VPS from the repo root: ./infra/deploy.sh
# First time: chmod +x infra/deploy.sh
set -e
cd "$(dirname "$0")/.."
REPO=$(pwd)
# Discard local changes in infra/ so pull never fails (chmod, edits, etc.)
git checkout -- infra/ 2>/dev/null || true
echo "Pulling latest from origin/main..."
git pull origin main --no-edit
chmod +x infra/deploy.sh infra/status.sh 2>/dev/null || true
# env_file lists ../.env then .env — both are resolved from the compose file’s directory; pin it so this never depends on shell cwd quirks.
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
echo "Building web image (3-5 min first time), then starting container..."
docker compose --project-directory "$REPO/infra" --env-file "$REPO/infra/.env" -f "$REPO/infra/docker-compose.yml" up -d --build --force-recreate web
echo "Watch logs: docker compose --project-directory $REPO/infra --env-file $REPO/infra/.env -f $REPO/infra/docker-compose.yml logs -f web"
