#!/bin/sh
# Apply only proposal-era PocketBase JS migrations (17806*) on production.
# Avoids replaying the full historical migrations tree.
#
# From repo root on the VPS:
#   chmod +x infra/run-proposal-migrations.sh
#   ./infra/run-proposal-migrations.sh
set -e
cd "$(dirname "$0")/.."

COMPOSE="docker compose --project-directory $(pwd)/infra --env-file $(pwd)/infra/.env -f $(pwd)/infra/docker-compose.yml"

MIGDIR="/tmp/wrr_proposal_migrations_$$"
mkdir -p "$MIGDIR"
cp -f apps/pb/pb_migrations/17806*.js "$MIGDIR"/
echo "Migrations to apply:"
ls -1 "$MIGDIR"

echo "Stopping pb..."
$COMPOSE stop pb

# Project volume is typically infra_pb_data (compose project name = infra)
VOL="infra_pb_data"
if ! docker volume inspect "$VOL" >/dev/null 2>&1; then
  VOL="web-ranking-reports_pb_data"
fi
if ! docker volume inspect "$VOL" >/dev/null 2>&1; then
  echo "Could not find pb_data volume (tried infra_pb_data and web-ranking-reports_pb_data)."
  $COMPOSE start pb || true
  rm -rf "$MIGDIR"
  exit 1
fi

echo "Running migrate up on volume $VOL ..."
docker run --rm \
  -v "$VOL:/pb_data" \
  -v "$MIGDIR:/migrations:ro" \
  --entrypoint /usr/local/bin/pocketbase \
  infra-pb \
  migrate up --dir=/pb_data --migrationsDir=/migrations

rm -rf "$MIGDIR"

echo "Starting pb..."
$COMPOSE start pb

echo "Done. Hard-refresh Catalog → Sync products now."
