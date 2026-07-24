#!/bin/sh
# Create PocketBase proposal collections (proposals, proposal_items, proposal_products)
# and sites.lifecycle. Safe to re-run.
#
# Production PocketBase uses --migrationsDir=/pb_data/pb_migrations_empty, so JS migrations
# under apps/pb/pb_migrations are NOT applied automatically. Use this script instead.
#
# From repo root on the VPS:
#   chmod +x infra/run-proposal-collections.sh   # once
#   ./infra/run-proposal-collections.sh
#
# Requires: Docker stack running, infra/.env with PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD,
# and PB_URL (default http://pb:8090 on the compose network).
set -e
cd "$(dirname "$0")/.."

if [ ! -f "infra/.env" ]; then
  echo "Missing infra/.env. Create it with PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD."
  exit 1
fi

ENV_FILE="$(pwd)/infra/.env"

NETWORK="infra_default"
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  NETWORK="web-ranking-reports_default"
fi
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  echo "Docker network not found. Start the stack first, then re-run."
  exit 1
fi

echo "Creating proposal collections (PB_URL and admin creds from infra/.env)..."
docker run --rm \
  --network "$NETWORK" \
  --env-file "$ENV_FILE" \
  -e PB_URL="${PB_URL:-http://pb:8090}" \
  -e POCKETBASE_URL="${POCKETBASE_URL:-http://pb:8090}" \
  -v "$(pwd):/repo" \
  -w /repo/apps/web \
  node:20-alpine \
  sh -c "node scripts/create-proposal-collections.mjs"

echo "Done. Hard-refresh /crm/proposals."
