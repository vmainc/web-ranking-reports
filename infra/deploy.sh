#!/bin/sh
# Run this ON THE VPS from the repo root: ./infra/deploy.sh
# First time: chmod +x infra/deploy.sh
set -e
cd "$(dirname "$0")/.."
# Allow pull to succeed even if deploy.sh was chmod'd or edited locally
git checkout -- infra/deploy.sh 2>/dev/null || true
echo "Pulling latest from origin/main..."
git pull origin main --no-edit
chmod +x infra/deploy.sh 2>/dev/null || true
echo "Recreating web container (build runs inside container, allow 2-5 min)..."
docker compose -f infra/docker-compose.yml up -d --build --force-recreate web
echo "Watch progress: docker compose -f infra/docker-compose.yml logs -f web"
