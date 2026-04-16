#!/usr/bin/env bash
# Run add-users-default-google-json.mjs without Node on the host (e.g. production VPS).
# Requires Docker only.
#
# From repo root (recommended — loads infra/.env automatically):
#   bash apps/web/scripts/run-add-users-default-google-json-docker.sh
#
# Or set vars explicitly (use public https://pb… for PB_URL when not sourcing infra/.env):
#   export PB_URL=https://pb.example.com
#   export PB_ADMIN_EMAIL=you@example.com
#   export PB_ADMIN_PASSWORD='your-admin-password'
#   bash apps/web/scripts/run-add-users-default-google-json-docker.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MJS="${SCRIPT_DIR}/add-users-default-google-json.mjs"
# Repo root: …/apps/web/scripts → ../../../
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
INFRA_ENV="${REPO_ROOT}/infra/.env"

if [[ -f "${INFRA_ENV}" ]]; then
  # infra/.env may reference unset vars; avoid `set -u` during source.
  set +u
  set -a
  # shellcheck disable=1090
  source "${INFRA_ENV}"
  set +a
  set -u
fi

if [[ ! -f "$MJS" ]]; then
  echo "Missing $MJS"
  exit 1
fi

# `docker run` is not on the compose network — http://pb:8090 never resolves. Prefer public URL.
if [[ -n "${NUXT_PUBLIC_POCKETBASE_URL:-}" ]]; then
  case "${PB_URL:-}" in
    *://pb:*|*://pb/*) export PB_URL="${NUXT_PUBLIC_POCKETBASE_URL}" ;;
  esac
fi
if [[ -z "${PB_URL:-}" ]] && [[ -n "${NUXT_PUBLIC_POCKETBASE_URL:-}" ]]; then
  export PB_URL="${NUXT_PUBLIC_POCKETBASE_URL}"
fi

if [[ -z "${PB_URL:-}" ]] && [[ -z "${NUXT_PUBLIC_POCKETBASE_URL:-}" ]]; then
  echo "Set PB_URL or NUXT_PUBLIC_POCKETBASE_URL (e.g. in ${INFRA_ENV})." >&2
  exit 1
fi

: "${PB_ADMIN_EMAIL:?Set PB_ADMIN_EMAIL in infra/.env or export it}"
: "${PB_ADMIN_PASSWORD:?Set PB_ADMIN_PASSWORD in infra/.env or export it}"

exec docker run --rm \
  -e PB_URL \
  -e POCKETBASE_URL="$PB_URL" \
  -e NUXT_PUBLIC_POCKETBASE_URL \
  -e PB_ADMIN_EMAIL \
  -e POCKETBASE_ADMIN_EMAIL="$PB_ADMIN_EMAIL" \
  -e PB_ADMIN_PASSWORD \
  -e POCKETBASE_ADMIN_PASSWORD="$PB_ADMIN_PASSWORD" \
  -v "${MJS}:/app/run.mjs:ro" \
  node:22-alpine \
  node /app/run.mjs
