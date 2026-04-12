#!/usr/bin/env bash
# Run add-users-default-google-json.mjs without Node on the host (e.g. production VPS).
# Requires Docker only.
#
# Usage (from repo root or anywhere):
#   export PB_URL=https://pb.example.com
#   export PB_ADMIN_EMAIL=you@example.com
#   export PB_ADMIN_PASSWORD='your-admin-password'
#   bash apps/web/scripts/run-add-users-default-google-json-docker.sh
#
# Or one line:
#   PB_URL=... PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... bash apps/web/scripts/run-add-users-default-google-json-docker.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MJS="${SCRIPT_DIR}/add-users-default-google-json.mjs"

if [[ ! -f "$MJS" ]]; then
  echo "Missing $MJS"
  exit 1
fi

: "${PB_URL:?Set PB_URL}"
: "${PB_ADMIN_EMAIL:?Set PB_ADMIN_EMAIL}"
: "${PB_ADMIN_PASSWORD:?Set PB_ADMIN_PASSWORD}"

exec docker run --rm \
  -e PB_URL \
  -e POCKETBASE_URL="$PB_URL" \
  -e PB_ADMIN_EMAIL \
  -e POCKETBASE_ADMIN_EMAIL="$PB_ADMIN_EMAIL" \
  -e PB_ADMIN_PASSWORD \
  -e POCKETBASE_ADMIN_PASSWORD="$PB_ADMIN_PASSWORD" \
  -v "${MJS}:/app/run.mjs:ro" \
  node:22-alpine \
  node /app/run.mjs
