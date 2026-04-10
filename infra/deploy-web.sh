#!/bin/sh
# Deploy web app (clean build so API routes like POST /api/crm/tasks are included).
# Run from repo root: ./infra/deploy-web.sh
set -e
cd "$(dirname "$0")/.."
ROOT="$PWD"
DC="docker compose --project-directory $ROOT/infra -f infra/docker-compose.yml"
echo "=== Pulling latest ==="
git pull origin main
echo "=== Verifying server route file exists ==="
test -f apps/web/server/api/crm/tasks.post.ts || { echo "MISSING: apps/web/server/api/crm/tasks.post.ts"; exit 1; }
echo "=== Building web (no cache) ==="
$DC build --no-cache web
echo "=== Starting web ==="
$DC up -d web
echo "=== Done. Test: curl -s -o /dev/null -w '%{http_code}' -X POST https://webrankingreports.com/api/crm/tasks (expect 401 without auth, not 404) ==="
