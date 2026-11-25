#!/bin/sh
# Create PocketBase `agency_plans` for Agency Planner saves (+ raw_response field if needed).
#
# From repo root on the VPS:
#   chmod +x infra/run-agency-plans-collection.sh
#   ./infra/run-agency-plans-collection.sh
set -e
cd "$(dirname "$0")/.."

if [ ! -f "infra/.env" ]; then
  echo "Missing infra/.env."
  exit 1
fi

get_env() {
  grep -E "^${1}=" infra/.env 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//'
}

PB_ADMIN_EMAIL="$(get_env PB_ADMIN_EMAIL)"
PB_ADMIN_PASSWORD="$(get_env PB_ADMIN_PASSWORD)"
POCKETBASE_ADMIN_EMAIL="$(get_env POCKETBASE_ADMIN_EMAIL)"
POCKETBASE_ADMIN_PASSWORD="$(get_env POCKETBASE_ADMIN_PASSWORD)"

export PB_URL="http://pb:8090"
export POCKETBASE_URL="http://pb:8090"

if [ -z "$POCKETBASE_ADMIN_EMAIL" ] && [ -n "$PB_ADMIN_EMAIL" ]; then
  export POCKETBASE_ADMIN_EMAIL="$PB_ADMIN_EMAIL"
fi
if [ -z "$POCKETBASE_ADMIN_PASSWORD" ] && [ -n "$PB_ADMIN_PASSWORD" ]; then
  export POCKETBASE_ADMIN_PASSWORD="$PB_ADMIN_PASSWORD"
fi

if [ -z "$POCKETBASE_ADMIN_EMAIL" ] || [ -z "$POCKETBASE_ADMIN_PASSWORD" ]; then
  echo "Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD in infra/.env"
  exit 1
fi

export POCKETBASE_ADMIN_EMAIL POCKETBASE_ADMIN_PASSWORD PB_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" PB_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD"

NETWORK="infra_default"
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  NETWORK="web-ranking-reports_default"
fi
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  echo "Docker network not found. Start the stack first."
  exit 1
fi

run_node() {
  docker run --rm \
    --network "$NETWORK" \
    -e PB_URL="$PB_URL" \
    -e POCKETBASE_URL="$POCKETBASE_URL" \
    -e POCKETBASE_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
    -e POCKETBASE_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
    -e PB_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
    -e PB_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
    -v "$(pwd):/repo" \
    -w /repo/apps/web \
    node:20-alpine node "$@"
}

echo "Creating agency_plans collection (if missing)..."
run_node scripts/add-agency-plans-collection.mjs

echo "Patching raw_response field (if needed)..."
run_node scripts/patch-agency-plans-raw-response.mjs

echo "Done. Retry Save plan in Agency Planner."