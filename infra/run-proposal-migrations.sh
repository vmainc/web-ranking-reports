#!/bin/sh
# Apply proposal-era PocketBase JS migrations on production.
# Production serve uses --migrationsDir=/pb_data/pb_migrations_empty, but the full
# migrations folder is still mounted at /pb_data/pb_migrations.
#
# From repo root on the VPS:
#   chmod +x infra/run-proposal-migrations.sh
#   ./infra/run-proposal-migrations.sh
set -e
cd "$(dirname "$0")/.."

COMPOSE="docker compose --project-directory $(pwd)/infra --env-file $(pwd)/infra/.env -f $(pwd)/infra/docker-compose.yml"

echo "Stopping pb (brief) so migrate can use the data dir..."
$COMPOSE stop pb

echo "Running migrate up with /pb_data/pb_migrations ..."
$COMPOSE run --rm --no-deps --entrypoint /usr/local/bin/pocketbase \
  pb migrate up --dir=/pb_data --migrationsDir=/pb_data/pb_migrations

echo "Starting pb..."
$COMPOSE start pb

echo "Done. Hard-refresh Catalog and Sync products now."
