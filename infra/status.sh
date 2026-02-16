#!/bin/sh
# Run on VPS from repo root: ./infra/status.sh
# Shows container status and last web logs.
set -e
cd "$(dirname "$0")/.."
echo "=== Container status ==="
docker compose -f infra/docker-compose.yml ps
echo ""
echo "=== Last 80 lines of web container log ==="
docker compose -f infra/docker-compose.yml logs --tail 80 web
