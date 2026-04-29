#!/bin/sh
# Create PocketBase `report_schedules` (automated reports) and add newer fields
# if an older collection exists without `report`, `from_email`, `to_email`.
#
# Run ON THE VPS from repo root (same pattern as run-create-collections.sh):
#   chmod +x infra/run-report-schedules-migrations.sh   # once
#   ./infra/run-report-schedules-migrations.sh
#
# Requires: Docker stack running (pb on the compose network), infra/.env with
# PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD (or POCKETBASE_ADMIN_*), PB_URL default http://pb:8090.
set -e
cd "$(dirname "$0")/.."

if [ ! -f "infra/.env" ]; then
  echo "Missing infra/.env. Create it with PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD."
  exit 1
fi

# Do not `source` or `. ./infra/.env` with /bin/sh: docker-compose env files are not always
# valid POSIX shell (bare words, unusual lines). Docker parses the same file safely.
ENV_FILE="$(pwd)/infra/.env"

NETWORK="infra_default"
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  NETWORK="web-ranking-reports_default"
fi
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  echo "Docker network not found. Start the stack first, then re-run."
  exit 1
fi

echo "Migrating report_schedules (PB_URL and admin creds from infra/.env via Docker)..."
docker run --rm \
  --network "$NETWORK" \
  --env-file "$ENV_FILE" \
  -v "$(pwd):/repo" \
  -w /repo/apps/web \
  node:20-alpine \
  sh -c "node scripts/add-report-schedules-collection.mjs && node scripts/upgrade-report-schedules-fields.mjs"

echo "Done. Automated report schedules API should return 200 after a refresh."
