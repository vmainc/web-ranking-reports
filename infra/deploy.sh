#!/bin/sh
# Run this ON THE VPS from the repo root: ./infra/deploy.sh
# First time: chmod +x infra/deploy.sh
set -e
cd "$(dirname "$0")/.."
# Discard local changes in infra/ so pull never fails (chmod, edits, etc.)
git checkout -- infra/ 2>/dev/null || true
echo "Pulling latest from origin/main..."
git pull origin main --no-edit
chmod +x infra/deploy.sh infra/status.sh 2>/dev/null || true
echo "Building web image (3-5 min first time), then starting container..."
docker compose -f infra/docker-compose.yml up -d --build --force-recreate web
echo "Watch logs: docker compose -f infra/docker-compose.yml logs -f web"
