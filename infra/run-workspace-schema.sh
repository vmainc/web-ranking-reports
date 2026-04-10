#!/usr/bin/env bash
# Run apps/web/scripts/add-workspace-schema.mjs on a host without Node (uses Docker).
# Prefers the running PocketBase container’s Docker network + http://pb:8090 (no public HTTPS needed).
#
# From repo root:
#   ./infra/run-workspace-schema.sh
# Force public URL instead:
#   PB_PUBLIC_ONLY=1 PB_URL=https://pb.yourdomain.com ./infra/run-workspace-schema.sh
set -euo pipefail

cd "$(dirname "$0")/.."
REPO=$(pwd)
INFRA="$REPO/infra"
COMPOSE_FILE="$INFRA/docker-compose.yml"
ENV_FILE="$REPO/infra/.env"

die() { echo "ERROR: $*" >&2; exit 1; }

[[ -f "$ENV_FILE" ]] || die "Missing $ENV_FILE"
[[ -f apps/web/scripts/add-workspace-schema.mjs ]] || die "Missing apps/web/scripts/add-workspace-schema.mjs"

compose() {
  docker compose --project-directory "$INFRA" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

# Docker’s --env-file does not allow `export KEY=`; strip that + UTF-8 BOM if present.
normalize_env_for_docker() {
  local out="$1"
  if command -v sed >/dev/null 2>&1; then
    sed -e '1s/^\xEF\xBB\xBF//' -e 's/^export[[:space:]]\{1,\}//' "$ENV_FILE" >"$out" || cp "$ENV_FILE" "$out"
  else
    cp "$ENV_FILE" "$out"
  fi
}

TMP_ENV=$(mktemp)
trap 'rm -f "$TMP_ENV"' EXIT
normalize_env_for_docker "$TMP_ENV"

NETWORK_ARGS=()
PB_URL_USE=""

if [[ "${PB_PUBLIC_ONLY:-}" != "1" ]]; then
  PB_CID=$(compose ps -q pb 2>/dev/null | head -n1 || true)
  if [[ -n "${PB_CID}" ]]; then
    NET=$(docker inspect -f '{{range $k, $_ := .NetworkSettings.Networks}}{{$k}}{{break}}{{end}}' "${PB_CID}" 2>/dev/null || true)
    if [[ -n "${NET}" ]]; then
      NETWORK_ARGS=(--network "${NET}")
      PB_URL_USE="http://pb:8090"
      echo "Using Docker network ${NET} and PB_URL=${PB_URL_USE} (PocketBase service name: pb)"
    fi
  else
    echo "WARN: No running 'pb' container from this compose project — start it: compose up -d pb" >&2
  fi
fi

if [[ -z "${PB_URL_USE}" ]]; then
  PB_URL_USE="${PB_URL:-https://pb.webrankingreports.com}"
  echo "Using public PB_URL=${PB_URL_USE} (set PB_URL=... if wrong; or start pb and re-run without PB_PUBLIC_ONLY)"
fi

echo "Running schema script (pulling node:20-bookworm-slim if needed)…"
set +e
OUT=$(docker run --rm \
  "${NETWORK_ARGS[@]}" \
  -v "$REPO:/work:ro" \
  -w /work/apps/web \
  --env-file "$TMP_ENV" \
  -e "PB_URL=$PB_URL_USE" \
  node:20-bookworm-slim \
  node scripts/add-workspace-schema.mjs 2>&1)
RC=$?
set -e
echo "$OUT"
if [[ "$RC" -ne 0 ]]; then
  echo >&2
  echo "If you saw 'could not find an available, non-overlapping IPv4 address pool' or network errors, try:" >&2
  echo "  PB_PUBLIC_ONLY=1 PB_URL=https://YOUR_PB_HOST ./infra/run-workspace-schema.sh" >&2
  echo "If auth failed, confirm PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD in infra/.env match PocketBase Admin login." >&2
  exit "$RC"
fi
