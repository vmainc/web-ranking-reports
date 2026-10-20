#!/bin/sh
# Read-only PocketBase schema check (website audit + CRM deps). Run on VPS from repo root:
#   ./infra/check-pocketbase-schema.sh
# Optional: pass a report token to confirm the lead row exists:
#   ./infra/check-pocketbase-schema.sh war_O2IR9qqMHVUR3jKB1fEWlOZEmLA-xgcj
set -e
cd "$(dirname "$0")/.."

if [ ! -f "infra/.env" ]; then
  echo "Missing infra/.env"
  exit 1
fi

get_env() {
  grep -E "^${1}=" infra/.env 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//'
}

POCKETBASE_ADMIN_EMAIL="$(get_env POCKETBASE_ADMIN_EMAIL)"
POCKETBASE_ADMIN_PASSWORD="$(get_env POCKETBASE_ADMIN_PASSWORD)"
PB_ADMIN_EMAIL="$(get_env PB_ADMIN_EMAIL)"
PB_ADMIN_PASSWORD="$(get_env PB_ADMIN_PASSWORD)"

export PB_URL="http://pb:8090"
export POCKETBASE_URL="http://pb:8090"
export POCKETBASE_ADMIN_EMAIL="${POCKETBASE_ADMIN_EMAIL:-$PB_ADMIN_EMAIL}"
export POCKETBASE_ADMIN_PASSWORD="${POCKETBASE_ADMIN_PASSWORD:-$PB_ADMIN_PASSWORD}"
export PB_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL"
export PB_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD"

if [ -z "$POCKETBASE_ADMIN_EMAIL" ] || [ -z "$POCKETBASE_ADMIN_PASSWORD" ]; then
  echo "Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD in infra/.env"
  exit 1
fi

NETWORK="infra_default"
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  NETWORK="web-ranking-reports_default"
fi
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  echo "Docker network not found — start the stack first."
  exit 1
fi

EXTRA=""
if [ -n "$1" ]; then
  EXTRA="--sample-token $1"
fi

docker run --rm \
  --network "$NETWORK" \
  -e PB_URL -e POCKETBASE_URL \
  -e POCKETBASE_ADMIN_EMAIL -e POCKETBASE_ADMIN_PASSWORD \
  -e PB_ADMIN_EMAIL -e PB_ADMIN_PASSWORD \
  -v "$(pwd):/repo" \
  -w /repo/apps/web \
  node:20-alpine \
  sh -c "npm ci --omit=dev 2>/dev/null || true; node scripts/check-pocketbase-collections.mjs $EXTRA"
