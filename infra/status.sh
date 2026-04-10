#!/bin/sh
# Run on VPS from repo root: ./infra/status.sh
# Shows container status and last web logs.
set -e
cd "$(dirname "$0")/.."
ROOT="$PWD"
DC="docker compose --project-directory $ROOT/infra -f infra/docker-compose.yml"
echo "=== infra/.env exists? ==="
ls -la infra/.env 2>/dev/null || echo "MISSING: infra/.env not found (copy from infra/.env.example)"
echo ""
echo "=== Container status ==="
$DC ps -a
echo ""
echo "=== Last 150 lines of web container log ==="
$DC logs --tail 150 web
echo ""
echo "=== Last 30 lines of caddy log ==="
$DC logs --tail 30 caddy
