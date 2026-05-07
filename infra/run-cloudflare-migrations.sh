#!/bin/sh
# Create/upgrade PocketBase Cloudflare schema without requiring Node on the VPS host.
#
# Run ON THE VPS from repo root:
#   chmod +x infra/run-cloudflare-migrations.sh   # once
#   ./infra/run-cloudflare-migrations.sh
#
# Requires:
# - Docker stack/network available
# - infra/.env with PB admin creds (PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD)
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

echo "Migrating Cloudflare collections/provider (PB_URL and admin creds from infra/.env via Docker)..."
docker run --rm \
  --network "$NETWORK" \
  --env-file "$ENV_FILE" \
  -v "$(pwd):/repo" \
  -w /repo/apps/web \
  node:20-alpine \
  sh -c "node scripts/add-cloudflare-collections.mjs && node scripts/add-cloudflare-provider.mjs"

echo "Done. Cloudflare connect should now work after refreshing the app."
