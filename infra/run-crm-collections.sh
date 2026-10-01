#!/bin/sh
# Create CRM collections in PocketBase when Node is not installed on the host.
# Run ON THE VPS from repo root:
#   chmod +x infra/run-crm-collections.sh   # once
#   ./infra/run-crm-collections.sh
# Uses a one-off Node container; loads PB_* from infra/.env.
set -e
cd "$(dirname "$0")/.."

if [ ! -f "infra/.env" ]; then
  echo "Missing infra/.env. Create it with PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD (and optionally PB_URL)."
  exit 1
fi

# Load KEY=VALUE pairs without `source` (avoids executing stray lines in infra/.env).
get_env() {
  grep -E "^${1}=" infra/.env 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//'
}

export PB_URL="$(get_env PB_URL)"
export PB_URL="${PB_URL:-http://pb:8090}"
export PB_ADMIN_EMAIL="$(get_env PB_ADMIN_EMAIL)"
export PB_ADMIN_PASSWORD="$(get_env PB_ADMIN_PASSWORD)"
export POCKETBASE_ADMIN_EMAIL="$(get_env POCKETBASE_ADMIN_EMAIL)"
export POCKETBASE_ADMIN_PASSWORD="$(get_env POCKETBASE_ADMIN_PASSWORD)"

if [ -z "$POCKETBASE_ADMIN_EMAIL" ] && [ -n "$PB_ADMIN_EMAIL" ]; then
  export POCKETBASE_ADMIN_EMAIL="$PB_ADMIN_EMAIL"
fi
if [ -z "$POCKETBASE_ADMIN_PASSWORD" ] && [ -n "$PB_ADMIN_PASSWORD" ]; then
  export POCKETBASE_ADMIN_PASSWORD="$PB_ADMIN_PASSWORD"
fi

if [ -z "$POCKETBASE_ADMIN_EMAIL" ] || [ -z "$POCKETBASE_ADMIN_PASSWORD" ]; then
  echo "Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD (or PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD) in infra/.env"
  exit 1
fi

# Use the same network as the stack (compose project name from infra/ = infra)
NETWORK="infra_default"
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  # Try alternate project name (repo root dir name)
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
