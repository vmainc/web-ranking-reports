#!/bin/sh
# Deploy web app (clean build so API routes like POST /api/crm/tasks are included).
# Run from repo root: ./infra/deploy-web.sh
set -e
cd "$(dirname "$0")/.."
REPO=$(pwd)
echo "=== Pulling latest ==="
git pull origin main
echo "=== Verifying server route file exists ==="
test -f apps/web/server/api/crm/tasks.post.ts || { echo "MISSING: apps/web/server/api/crm/tasks.post.ts"; exit 1; }
test -f apps/web/server/api/website-audit/\[key\]/submit.post.ts || {
  echo "MISSING: apps/web/server/api/website-audit/[key]/submit.post.ts"
  exit 1
}
[ -f .env ] || touch .env
echo "=== Building web (no cache) ==="
docker compose --project-directory "$REPO/infra" --env-file "$REPO/infra/.env" -f "$REPO/infra/docker-compose.yml" build --no-cache web
echo "=== Starting web ==="
docker compose --project-directory "$REPO/infra" --env-file "$REPO/infra/.env" -f "$REPO/infra/docker-compose.yml" up -d web
echo "=== Done. Smoke tests (expect NOT 404): ==="
echo "  curl -s -o /dev/null -w '%{http_code}' -X POST https://webrankingreports.com/api/crm/tasks"
echo "  curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' https://webrankingreports.com/api/website-audit/waf_test/submit"
echo "(website-audit submit should be 400/404 Form not found — route must exist, not nginx 404 HTML)"
