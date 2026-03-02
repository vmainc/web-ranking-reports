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

# Load infra/.env (PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD, etc.)
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

echo "Creating CRM collections in PocketBase ($PB_URL)..."
docker run --rm \
  --network "$NETWORK" \
  -v "$(pwd):/repo" \
  -w /repo/apps/web \
  -e PB_URL="$PB_URL" \
  -e POCKETBASE_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
  -e POCKETBASE_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
  node:20-alpine \
  node scripts/create-crm-collections.mjs

echo "Done."
