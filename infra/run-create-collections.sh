#!/bin/sh
# Sync PocketBase collections on production (lead_forms, lead_submissions, CRM, etc.)
# when Node is not installed on the host. Use this to align PROD with DEV.
#
# Run ON THE VPS from repo root:
#   chmod +x infra/run-create-collections.sh   # once
#   ./infra/run-create-collections.sh
#
# Loads PB_* from infra/.env; uses a one-off Node container.
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
  echo "Docker network not found. Start the stack first: ./infra/deploy.sh"
  exit 1
fi

echo "Syncing PocketBase collections ($PB_URL)..."
docker run --rm \
  --network "$NETWORK" \
  -v "$(pwd):/repo" \
  -w /repo/apps/web \
  -e PB_URL="$PB_URL" \
  -e POCKETBASE_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
  -e POCKETBASE_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
  node:20-alpine \
  node scripts/create-missing-collections.mjs

echo "Done."
