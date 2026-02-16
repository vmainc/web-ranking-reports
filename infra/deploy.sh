#!/bin/sh
# Run this ON THE VPS from the repo root: ./infra/deploy.sh
# First time: chmod +x infra/deploy.sh
set -e
cd "$(dirname "$0")/.."
echo "Pulling latest from origin/main..."
git pull origin main --no-edit
echo "Recreating web container (build runs inside container, allow 2-5 min)..."
docker compose -f infra/docker-compose.yml up -d --build --force-recreate web
echo "Watch progress: docker compose -f infra/docker-compose.yml logs -f web"
