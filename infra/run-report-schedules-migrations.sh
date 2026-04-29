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

set -a
. ./infra/.env
set +a

export PB_URL="${PB_URL:-http://pb:8090}"
if [ -z "$POCKETBASE_ADMIN_EMAIL" ] && [ -n "$PB_ADMIN_EMAIL" ]; then
  export POCKETBASE_ADMIN_EMAIL="$PB_ADMIN_EMAIL"
fi
if [ -z "$POCKETBASE_ADMIN_PASSWORD" ] && [ -n "$PB_ADMIN_PASSWORD" ]; then
  export POCKETBASE_ADMIN_PASSWORD="$PB_ADMIN_PASSWORD"
fi

if [ -z "$POCKETBASE_ADMIN_EMAIL" ] || [ -z "$POCKETBASE_ADMIN_PASSWORD" ]; then
  echo "Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD (or PB_ADMIN_*) in infra/.env"
  exit 1
fi

NETWORK="infra_default"
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  NETWORK="web-ranking-reports_default"
fi
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  echo "Docker network not found. Start the stack first, then re-run."
  exit 1
fi

echo "Migrating report_schedules on PocketBase ($PB_URL)..."
docker run --rm \
  --network "$NETWORK" \
  -v "$(pwd):/repo" \
  -w /repo/apps/web \
  -e PB_URL="$PB_URL" \
  -e POCKETBASE_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
  -e POCKETBASE_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
  node:20-alpine \
  sh -c "node scripts/add-report-schedules-collection.mjs && node scripts/upgrade-report-schedules-fields.mjs"

echo "Done. Automated report schedules API should return 200 after a refresh."
