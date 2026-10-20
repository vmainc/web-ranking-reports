#!/bin/sh
# Run ON THE VPS from repo root. Confirms Nitro registered POST /api/website-audit/:key/submit.
# Usage: ./infra/smoke-website-audit-submit.sh [public_key]
#
# Default: POST to Nuxt inside the web container (http://127.0.0.1:3000). Host port 3000 is not published.
set -e
cd "$(dirname "$0")/.."
REPO=$(pwd)
KEY="${1:-waf_test}"
PATH_PART="/api/website-audit/$(printf '%s' "$KEY" | sed 's/ /%20/g')/submit"
BODY_FILE=/tmp/wrr-audit-submit-body.txt

COMPOSE="docker compose --project-directory $REPO/infra --env-file $REPO/infra/.env -f $REPO/infra/docker-compose.yml"

run_smoke() {
  if [ "$SMOKE_VIA" = "curl" ] || [ -n "$SMOKE_ORIGIN" ]; then
    smoke_curl
  else
    if $COMPOSE ps --status running web 2>/dev/null | grep -q web; then
      smoke_docker
    else
      echo "WARN: web container not running; falling back to curl."
      smoke_curl
    fi
  fi
}

smoke_docker() {
  echo "POST http://127.0.0.1:3000$PATH_PART (inside web container)"
  # shellcheck disable=SC2016
  OUT=$($COMPOSE exec -T web node -e '
const key = process.argv[1];
const path = "/api/website-audit/" + encodeURIComponent(key) + "/submit";
const body = JSON.stringify({
  name: "Smoke",
  email: "smoke@example.com",
  website: "https://example.com",
  _startedAt: 1,
});
fetch("http://127.0.0.1:3000" + path, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body,
})
  .then(async (r) => {
    const text = await r.text();
    process.stdout.write(String(r.status) + "\n---BODY---\n" + text.slice(0, 800));
  })
  .catch((e) => {
    process.stdout.write("000\n---BODY---\n" + (e && e.message ? e.message : String(e)));
    process.exit(1);
  });
' "$KEY" 2>/dev/null) || OUT="000
---BODY---
docker exec failed"

  CODE=$(printf '%s' "$OUT" | head -1 | tr -dc '0-9')
  BODY=$(printf '%s' "$OUT" | sed -n '2,$p' | sed '1d')
  printf '%s' "$BODY" > "$BODY_FILE"
  echo "-> HTTP ${CODE:-000}"
  head -c 400 "$BODY_FILE" 2>/dev/null || true
  echo ""
  interpret_code "${CODE:-000}"
}

smoke_curl() {
  DOMAIN=webrankingreports.com
  if [ -f "$REPO/infra/.env" ]; then
    line=$(grep -E '^WEBRANKINGREPORTS_DOMAIN=' "$REPO/infra/.env" 2>/dev/null | tail -1 || true)
    if [ -n "$line" ]; then
      DOMAIN=$(printf '%s' "$line" | cut -d= -f2- | tr -d '"' | tr -d "'")
    fi
  fi
  ORIGIN="${SMOKE_ORIGIN:-http://127.0.0.1}"
  URL="$ORIGIN$PATH_PART"
  CURL_EXTRA=
  if [ "$ORIGIN" != "http://127.0.0.1:3000" ] && [ "$ORIGIN" != "http://localhost:3000" ]; then
    CURL_EXTRA="-H Host:$DOMAIN"
  fi
  if [ "${ORIGIN#https://}" != "$ORIGIN" ]; then
    CURL_EXTRA="$CURL_EXTRA -k"
  fi
  # shellcheck disable=SC2086
  CODE=$(curl -sS $CURL_EXTRA -o "$BODY_FILE" -w '%{http_code}' \
    -X POST \
    -H 'Content-Type: application/json' \
    -d '{"name":"Smoke","email":"smoke@example.com","website":"https://example.com","_startedAt":1}' \
    "$URL" 2>/dev/null || printf '000')
  CODE=$(printf '%s' "$CODE" | tr -dc '0-9' | head -c 3)
  echo "POST $URL -> HTTP $CODE"
  head -c 400 "$BODY_FILE" 2>/dev/null || true
  echo ""
  interpret_code "$CODE"
}

interpret_code() {
  CODE=$1
  case "$CODE" in
    000|'')
      echo "FAIL: Could not reach the web app."
      echo "  ./infra/status.sh"
      echo "  ./infra/deploy.sh   or   ./infra/deploy-web.sh"
      exit 1
      ;;
    404)
      if grep -q '<!DOCTYPE html' "$BODY_FILE" 2>/dev/null; then
        echo "FAIL: HTML 404 — old web image (missing submit route). Run ./infra/deploy-web.sh"
        exit 1
      fi
      if grep -q 'Form not found' "$BODY_FILE" 2>/dev/null; then
        echo "OK: submit route exists (404 Form not found — check embed key in CRM → Website audit)."
        exit 0
      fi
      if grep -q 'Server Error' "$BODY_FILE" 2>/dev/null || grep -q 'Page not found' "$BODY_FILE" 2>/dev/null; then
        echo "FAIL: POST submit route is not in the running web image (Nitro 404)."
        echo "  Run:  ./infra/deploy-web.sh"
        echo "  Then re-run this smoke test (expect 200, 400, or JSON \"Form not found\")."
        exit 1
      fi
      echo "WARN: JSON 404 — unclear; run ./infra/deploy-web.sh if embed submit still fails."
      exit 1
      ;;
    308|301|302)
      echo "FAIL: Redirect HTTP $CODE. Prefer default docker smoke (unset SMOKE_ORIGIN) or fix Caddy."
      exit 1
      ;;
    400|429)
      echo "OK: submit route exists (HTTP $CODE)."
      exit 0
      ;;
    200)
      echo "OK: submit accepted."
      exit 0
      ;;
    *)
      echo "WARN: unexpected HTTP $CODE — see body above or ./infra/status.sh"
      exit 0
      ;;
  esac
}

run_smoke
