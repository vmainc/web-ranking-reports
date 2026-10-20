#!/bin/sh
# Run ON THE VPS from repo root. Confirms Nitro registered POST /api/website-audit/:key/submit.
# Usage: ./infra/smoke-website-audit-submit.sh [public_key]
#
# Production web listens on :3000 inside Docker only (not on the host). Default smoke hits Caddy on
# localhost:80 with Host: webrankingreports.com — same path as real traffic, no Cloudflare.
set -e
cd "$(dirname "$0")/.."
REPO=$(pwd)
KEY="${1:-waf_test}"

DOMAIN=webrankingreports.com
if [ -f "$REPO/infra/.env" ]; then
  line=$(grep -E '^WEBRANKINGREPORTS_DOMAIN=' "$REPO/infra/.env" 2>/dev/null | tail -1 || true)
  if [ -n "$line" ]; then
    DOMAIN=$(printf '%s' "$line" | cut -d= -f2- | tr -d '"' | tr -d "'")
  fi
fi

# Default: Caddy on localhost:443 (HTTP :80 returns 308 → HTTPS). Override with SMOKE_ORIGIN if needed.
ORIGIN="${SMOKE_ORIGIN:-https://127.0.0.1}"
USE_HOST_HEADER=true
CURL_TLS=
case "$ORIGIN" in
  http://127.0.0.1:3000 | http://localhost:3000)
    USE_HOST_HEADER=false
    ;;
  https://127.0.0.1* | https://localhost*)
    CURL_TLS=-k
    ;;
esac

PATH_PART="/api/website-audit/$(printf '%s' "$KEY" | sed 's/ /%20/g')/submit"
URL="$ORIGIN$PATH_PART"

if [ "$USE_HOST_HEADER" = true ]; then
  CODE=$(curl -sS $CURL_TLS -o /tmp/wrr-audit-submit-body.txt -w '%{http_code}' \
    -X POST \
    -H "Host: $DOMAIN" \
    -H 'Content-Type: application/json' \
    -d '{"name":"Smoke","email":"smoke@example.com","website":"https://example.com","_startedAt":1}' \
    "$URL" 2>/dev/null || echo "000")
  echo "POST $URL (Host: $DOMAIN) -> HTTP $CODE"
else
  CODE=$(curl -sS $CURL_TLS -o /tmp/wrr-audit-submit-body.txt -w '%{http_code}' \
    -X POST \
    -H 'Content-Type: application/json' \
    -d '{"name":"Smoke","email":"smoke@example.com","website":"https://example.com","_startedAt":1}' \
    "$URL" 2>/dev/null || echo "000")
  echo "POST $URL -> HTTP $CODE"
fi
head -c 400 /tmp/wrr-audit-submit-body.txt 2>/dev/null || true
echo ""

if [ "$CODE" = "000" ]; then
  echo "FAIL: Could not connect to $ORIGIN"
  echo "  - Is the stack up?  ./infra/status.sh"
  echo "  - On VPS, do NOT use port 3000 on the host unless you added docker-compose.override.yml."
  echo "  - Retry:  ./infra/smoke-website-audit-submit.sh $KEY   (defaults to Caddy on http://127.0.0.1)"
  exit 1
fi

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
echo "WARN: unexpected status $CODE — check body above or ./infra/status.sh"
exit 0
