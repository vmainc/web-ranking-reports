#!/bin/sh
# Run ON THE VPS from repo root. Confirms Nitro registered POST /api/website-audit/:key/submit.
# Usage: ./infra/smoke-website-audit-submit.sh [public_key]
set -e
cd "$(dirname "$0")/.."
KEY="${1:-waf_test}"
ORIGIN="${SMOKE_ORIGIN:-http://127.0.0.1:3000}"
URL="$ORIGIN/api/website-audit/$(printf '%s' "$KEY" | sed 's/ /%20/g')/submit"
CODE=$(curl -sS -o /tmp/wrr-audit-submit-body.txt -w '%{http_code}' \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"name":"Smoke","email":"smoke@example.com","website":"https://example.com","_startedAt":1}' \
  "$URL" || true)
echo "POST $URL -> HTTP $CODE"
head -c 400 /tmp/wrr-audit-submit-body.txt 2>/dev/null || true
echo ""
if [ "$CODE" = "404" ]; then
  if grep -q '<!DOCTYPE html' /tmp/wrr-audit-submit-body.txt 2>/dev/null; then
    echo "FAIL: Got HTML 404 — web container is likely on an old image (missing submit route). Run ./infra/deploy-web.sh"
    exit 1
  fi
  echo "OK: JSON 404 (form/key) — submit route exists."
  exit 0
fi
if [ "$CODE" = "400" ] || [ "$CODE" = "429" ]; then
  echo "OK: submit route exists (HTTP $CODE)."
  exit 0
fi
if [ "$CODE" = "200" ]; then
  echo "OK: submit accepted (use a real embed key for end-to-end test)."
  exit 0
fi
echo "WARN: unexpected status $CODE (Cloudflare in front of public URL may block curl; use SMOKE_ORIGIN=http://127.0.0.1:3000 on VPS)."
exit 0
