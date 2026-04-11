#!/usr/bin/env bash
# LOCAL: Copy PocketBase data from the production/VPS Docker volume into apps/pb/
# so your Mac runs the same DB + files as the server.
#
# Prerequisites on the VPS: Docker Compose stack running; SSH access; permission to
# run `docker compose` in the repo (often as root or in the `docker` group).
#
# Usage:
#   ./scripts/sync-pb-from-vps.sh user@vps-host
#
# Optional:
#   SYNC_PB_REPO_ROOT — path on the VPS to the git repo root (default: ~/web-ranking-reports)

set -euo pipefail

SSH_TARGET="${1:-}"
if [[ -z "${SSH_TARGET}" ]]; then
  echo "Usage: $0 user@vps-host" >&2
  echo "Example: $0 root@163.245.212.8" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PB_DIR="${ROOT}/apps/pb"
REMOTE_ROOT="${SYNC_PB_REPO_ROOT:-~/web-ranking-reports}"
ARCHIVE="$(mktemp /tmp/pb_data_sync.XXXXXX.tar.gz)"

cleanup() { rm -f "${ARCHIVE}"; }
trap cleanup EXIT

echo "==> Fetching /pb_data from ${SSH_TARGET} (repo ${REMOTE_ROOT})..."
ssh "${SSH_TARGET}" \
  "cd ${REMOTE_ROOT} && docker compose --project-directory infra --env-file infra/.env -f infra/docker-compose.yml exec -T pb tar czf - -C /pb_data ." \
  > "${ARCHIVE}"

if [[ ! -s "${ARCHIVE}" ]]; then
  echo "ERROR: archive is empty — check SSH, compose file path, env file, and that the pb container is running." >&2
  exit 1
fi

echo "==> Stopping local PocketBase (if running)..."
pkill -f 'pocketbase serve' 2>/dev/null || true
sleep 1

BACKUP="${PB_DIR}/.backup-$(date +%Y%m%d%H%M%S)"
mkdir -p "${BACKUP}"
for f in data.db logs.db; do
  if [[ -f "${PB_DIR}/${f}" ]]; then
    mv "${PB_DIR}/${f}" "${BACKUP}/"
  fi
done
if [[ -d "${PB_DIR}/storage" ]]; then
  mv "${PB_DIR}/storage" "${BACKUP}/storage"
fi

echo "==> Extracting into ${PB_DIR} ..."
tar xzf "${ARCHIVE}" -C "${PB_DIR}"

echo "==> Done."
echo "    Previous data (if any): ${BACKUP}"
echo "    Admin login matches the VPS PocketBase (stored in the copied DB)."
echo ""
echo "Start PocketBase from repo root:"
echo "  ./apps/pb/pocketbase serve --dir=apps/pb --migrationsDir=apps/pb/pb_migrations"
echo "Then:"
echo "  cd apps/web && npm run dev"
echo "Use apps/web/.env: NUXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090"
