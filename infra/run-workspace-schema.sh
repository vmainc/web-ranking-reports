#!/bin/sh
# Run PocketBase workspace schema + backfill on a host without Node (uses Docker).
# From repo root: PB_URL=https://pb.yourdomain.com ./infra/run-workspace-schema.sh
set -e
cd "$(dirname "$0")/.."
REPO=$(pwd)
test -f infra/.env || { echo "Missing infra/.env"; exit 1; }
test -f apps/web/scripts/add-workspace-schema.mjs || { echo "Missing apps/web/scripts/add-workspace-schema.mjs"; exit 1; }
# Host must reach PocketBase on a public URL (not http://pb:8090 — that only works inside compose).
PB_URL_EFFECTIVE=${PB_URL:-https://pb.webrankingreports.com}
echo "Using PB_URL=$PB_URL_EFFECTIVE (override with PB_URL=... if needed)"
docker run --rm \
  -v "$REPO:/work:ro" \
  -w /work/apps/web \
  --env-file "$REPO/infra/.env" \
  -e "PB_URL=$PB_URL_EFFECTIVE" \
  node:20-bookworm-slim \
  node scripts/add-workspace-schema.mjs
