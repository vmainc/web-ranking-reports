#!/usr/bin/env bash
# Start PocketBase (restored DB / no migration conflicts) then Nuxt dev in the foreground.
# Usage: from apps/web — npm run dev:stack
set -euo pipefail
WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PB_DIR="$(cd "$WEB_DIR/../pb" && pwd)"
cd "$WEB_DIR"

if [[ ! -x "$PB_DIR/pocketbase" ]]; then
  echo "Missing PocketBase binary: $PB_DIR/pocketbase"
  exit 1
fi

pkill -f "pocketbase serve" 2>/dev/null || true
sleep 0.5

echo "Starting PocketBase (pb:live)…"
npm run pb:live &

for _ in $(seq 1 60); do
  if nc -z 127.0.0.1 8090 2>/dev/null; then
    echo "PocketBase listening on :8090"
    break
  fi
  sleep 0.25
done

if ! nc -z 127.0.0.1 8090 2>/dev/null; then
  echo "PocketBase did not open port 8090 in time. Check output above."
  pkill -f "pocketbase serve" 2>/dev/null || true
  exit 1
fi

cleanup() {
  pkill -f "pocketbase serve" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting Nuxt (Ctrl+C stops Nuxt and PocketBase)…"
exec npm run dev
