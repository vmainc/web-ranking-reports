#!/bin/sh
# Run ON THE VPS from repo root. Confirms website audit GET + POST APIs inside the web container.
# Usage: ./infra/smoke-website-audit-submit.sh [public_key]
set -e
cd "$(dirname "$0")/.."
REPO=$(pwd)
KEY="${1:-waf_test}"
PATH_PART="/api/website-audit/$(printf '%s' "$KEY" | sed 's/ /%20/g')"
SUBMIT_PATH="${PATH_PART}/submit"
BODY_FILE=/tmp/wrr-audit-submit-body.txt

COMPOSE="docker compose --project-directory $REPO/infra --env-file $REPO/infra/.env -f $REPO/infra/docker-compose.yml"

interpret_post() {
  GET_C=$1
  POST_C=$2
  if [ "$GET_C" = "200" ] && [ "$POST_C" = "200" ]; then
    echo "OK: GET and POST succeeded."
    exit 0
  fi
  if [ "$GET_C" = "200" ] && { [ "$POST_C" = "400" ] || [ "$POST_C" = "429" ]; }; then
    echo "OK: GET works; POST route exists (HTTP $POST_C validation/rate limit)."
    exit 0
  fi
  if [ "$GET_C" = "404" ] || [ "$GET_C" = "000" ]; then
    echo "FAIL: Public form GET failed (HTTP $GET_C)."
    echo "  In WRR: CRM → Website audit → Save settings (refreshes embed key index)."
    echo "  Confirm the embed key on the site matches CRM."
    exit 1
  fi
  if [ "$GET_C" = "200" ] && [ "$POST_C" = "404" ]; then
    echo "FAIL: GET works but POST submit returned 404 — report this (route registration bug)."
    exit 1
  fi
  if [ "$POST_C" = "503" ] || [ "$GET_C" = "503" ]; then
    echo "FAIL: PocketBase admin env missing or invalid in web container."
    echo "  Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD (or NUXT_PB_ADMIN_*) in infra/.env, then recreate web:"
    echo "  docker compose --project-directory infra --env-file infra/.env -f infra/docker-compose.yml up -d --force-recreate web"
    exit 1
  fi
  if [ "$POST_C" = "500" ] || [ "$POST_C" = "000" ]; then
    echo "FAIL: POST error (HTTP $POST_C). Common fix:"
    echo "  ./infra/run-website-audit-leads-collection.sh"
    echo "  Then check: docker compose ... logs --tail 80 web"
    exit 1
  fi
  echo "WARN: GET=$GET_C POST=$POST_C — see bodies above or ./infra/status.sh"
  exit 1
}

if ! $COMPOSE ps --status running web 2>/dev/null | grep -q web; then
  echo "FAIL: web container is not running. Run ./infra/deploy.sh"
  exit 1
fi

echo "=== Checking built Nitro routes in web image ==="
if $COMPOSE exec -T web sh -c 'test -f .output/server/chunks/routes/api/website-audit/_key/submit.post.mjs'; then
  echo "OK: submit.post.mjs present in .output"
else
  echo "FAIL: submit.post.mjs missing in running container — run ./infra/deploy-web.sh"
  exit 1
fi

echo "=== GET $PATH_PART (inside web container) ==="
GET_OUT=$($COMPOSE exec -T web node -e '
const key = process.argv[1];
const path = "/api/website-audit/" + encodeURIComponent(key);
fetch("http://127.0.0.1:3000" + path)
  .then(async (r) => {
    const text = await r.text();
    process.stdout.write(String(r.status) + "\n---BODY---\n" + text.slice(0, 600));
  })
  .catch((e) => process.stdout.write("000\n---BODY---\n" + e.message));
' "$KEY" 2>/dev/null) || GET_OUT="000
---BODY---
exec failed"

GET_CODE=$(printf '%s' "$GET_OUT" | head -1 | tr -dc '0-9')
GET_BODY=$(printf '%s' "$GET_OUT" | sed -n '2,$p' | sed '1d')
echo "GET -> HTTP ${GET_CODE:-000}"
printf '%s' "$GET_BODY" | head -c 300
echo ""
echo ""

echo "=== POST $SUBMIT_PATH (inside web container) ==="
POST_OUT=$($COMPOSE exec -T web node -e '
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
  .catch((e) => process.stdout.write("000\n---BODY---\n" + e.message));
' "$KEY" 2>/dev/null) || POST_OUT="000
---BODY---
exec failed"

POST_CODE=$(printf '%s' "$POST_OUT" | head -1 | tr -dc '0-9')
POST_BODY=$(printf '%s' "$POST_OUT" | sed -n '2,$p' | sed '1d')
printf '%s' "$POST_BODY" > "$BODY_FILE"
echo "POST -> HTTP ${POST_CODE:-000}"
head -c 400 "$BODY_FILE" 2>/dev/null || true
echo ""

interpret_post "$GET_CODE" "$POST_CODE"
