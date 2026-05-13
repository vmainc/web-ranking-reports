#!/bin/sh
# Create PocketBase billing collections (`subscriptions`, `usage_limits`, `subscription_usage_events`)
# and seed plan limits. Safe to re-run: skips existing collections; `upgrade-subscriptions-trial-fields.mjs`
# is a no-op when trial fields already exist.
#
# Production PocketBase is started with an empty migrations dir (see Dockerfile.pb), so new schema
# is applied with this script (same pattern as run-report-schedules-migrations.sh).
#
# From repo root on the VPS:
#   chmod +x infra/run-subscriptions-migrations.sh   # once
#   ./infra/run-subscriptions-migrations.sh
#
# Requires: Docker stack running, infra/.env with PB admin credentials, PB_URL default http://pb:8090.
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

echo "Applying subscriptions / usage_limits schema (PB_URL and admin creds from infra/.env)..."
docker run --rm \
  --network "$NETWORK" \
  --env-file "$ENV_FILE" \
  -v "$(pwd):/repo" \
  -w /repo/apps/web \
  node:20-alpine \
  sh -c "node scripts/add-subscriptions-collections.mjs && node scripts/upgrade-subscriptions-trial-fields.mjs"

echo "Done. Restart the web service if it was caching errors, then test /dashboard/billing."
