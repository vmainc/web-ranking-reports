#!/bin/sh
# Run this ON THE VPS from the repo root: ./infra/deploy.sh
# Or: cd ~/web-ranking-reports && ./infra/deploy.sh
set -e
cd "$(dirname "$0")/.."
echo "Pulling latest from origin/main..."
git pull origin main --no-edit
echo "Rebuilding and restarting web..."
docker compose -f infra/docker-compose.yml up -d --build --force-recreate web
echo "Done. Check: docker compose -f infra/docker-compose.yml logs -f web"
