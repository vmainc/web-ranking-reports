#!/bin/sh
# Add crm_clients.website field (prospect / lead URL — not the connected workspace site).
#
# From repo root on the VPS, after backup:
#   chmod +x infra/run-crm-client-website-field.sh
#   ./infra/run-crm-client-website-field.sh
set -e
cd "$(dirname "$0")/.."

if [ ! -f "infra/.env" ]; then
  echo "Missing infra/.env"
  exit 1
fi

if [ ! -f "apps/web/scripts/add-crm-client-website-field.mjs" ]; then
  echo "Missing script — git pull first."
  exit 1
fi

get_env() {
  grep -E "^${1}=" infra/.env 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//'
}

export POCKETBASE_ADMIN_EMAIL="$(get_env POCKETBASE_ADMIN_EMAIL)"
export POCKETBASE_ADMIN_PASSWORD="$(get_env POCKETBASE_ADMIN_PASSWORD)"
[ -n "$POCKETBASE_ADMIN_EMAIL" ] || export POCKETBASE_ADMIN_EMAIL="$(get_env PB_ADMIN_EMAIL)"
[ -n "$POCKETBASE_ADMIN_PASSWORD" ] || export POCKETBASE_ADMIN_PASSWORD="$(get_env PB_ADMIN_PASSWORD)"

export PB_URL="http://pb:8090"
export POCKETBASE_URL="http://pb:8090"

NETWORK="infra_default"
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  NETWORK="web-ranking-reports_default"
fi

docker run --rm \
  --network "$NETWORK" \
  -e PB_URL -e POCKETBASE_URL \
  -e POCKETBASE_ADMIN_EMAIL -e POCKETBASE_ADMIN_PASSWORD \
  -v "$(pwd):/repo" \
  -w /repo/apps/web \
  node:20-alpine \
  node scripts/add-crm-client-website-field.mjs

echo "Done."