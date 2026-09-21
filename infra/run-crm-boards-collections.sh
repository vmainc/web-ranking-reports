#!/bin/sh
# Create PocketBase collections for shared CRM Trello-style boards:
#   crm_boards, crm_board_lists, crm_board_cards
#
# Production PocketBase uses --migrationsDir=/pb_data/pb_migrations_empty, so
# apps/pb/pb_migrations/1780900000_crm_boards.js is NOT applied on pb restart.
# Use this idempotent admin-API script instead.
#
# From repo root on the VPS, AFTER a PocketBase backup:
#   chmod +x infra/run-crm-boards-collections.sh
#   ./infra/run-crm-boards-collections.sh
set -e
cd "$(dirname "$0")/.."

if [ ! -f "infra/.env" ]; then
  echo "Missing infra/.env. Create it with PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD."
  exit 1
fi

if [ ! -f "apps/web/scripts/add-crm-boards-collections.mjs" ]; then
  echo "Missing apps/web/scripts/add-crm-boards-collections.mjs — git pull origin main first."
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
  echo "Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD (or PB_ADMIN_*) in infra/.env"
  exit 1
fi

export POCKETBASE_ADMIN_EMAIL POCKETBASE_ADMIN_PASSWORD

NETWORK="infra_default"
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  NETWORK="web-ranking-reports_default"
fi
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  echo "Docker network not found. Start the stack first, then re-run."
  exit 1
fi

echo "Creating CRM board collections via $POCKETBASE_URL (admin: $POCKETBASE_ADMIN_EMAIL)..."
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
  node:20-alpine \
  node scripts/add-crm-boards-collections.mjs

echo "Done. Recreate the web container if it cached missing-collection errors."
