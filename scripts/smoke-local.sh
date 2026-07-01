#!/usr/bin/env bash
# Local smoke checks — no third-party credentials required.
# Usage: bash scripts/smoke-local.sh [NUXT_URL] [PB_URL]
set -euo pipefail

NUXT_URL="${1:-http://127.0.0.1:3000}"
PB_URL="${2:-http://127.0.0.1:8090}"

fail=0
check() {
  local name="$1"
  local url="$2"
  local expect="${3:-200}"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 "$url" || echo "000")
  if [[ "$code" == "$expect" ]]; then
    echo "OK  $name ($code) $url"
  else
    echo "FAIL $name (got $code, want $expect) $url" >&2
    fail=$((fail + 1))
  fi
}

echo "==> Smoke: Nuxt $NUXT_URL"
check "health" "$NUXT_URL/api/health"
check "homepage" "$NUXT_URL/"

echo "==> Smoke: PocketBase $PB_URL"
check "pb health" "$PB_URL/api/health"

if [[ "$fail" -gt 0 ]]; then
  echo "" >&2
  echo "$fail check(s) failed. Is dev:stack running?" >&2
  exit 1
fi
echo "All smoke checks passed."
