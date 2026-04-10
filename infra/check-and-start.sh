#!/bin/bash
# Run on VPS (e.g. ssh root@163.245.212.8) from repo root:
#   cd ~/web-ranking-reports && bash infra/check-and-start.sh
set -e
cd "$(dirname "$0")/.."
REPO=$(pwd)
echo "=== Docker ==="
docker --version 2>/dev/null || { echo "Docker not installed. See docs/DEPLOY_TO_WEBRANKINGREPORTS.md step 2."; exit 1; }
docker compose version 2>/dev/null || { echo "Docker Compose plugin not installed."; exit 1; }

echo ""
echo "=== Repo and env ==="
test -f infra/.env || { echo "infra/.env missing. Run: cp infra/.env.example infra/.env && nano infra/.env"; exit 1; }
grep -q NUXT_PUBLIC_POCKETBASE_URL infra/.env || echo "WARN: NUXT_PUBLIC_POCKETBASE_URL not set in infra/.env"
smtp_user_ok=false
smtp_pass_ok=false
grep -qE '^SMTP_USER=.+$' infra/.env 2>/dev/null && smtp_user_ok=true
grep -qE '^SMTP_USER=.+$' .env 2>/dev/null && smtp_user_ok=true
grep -qE '^SMTP_PASSWORD=.+$' infra/.env 2>/dev/null && smtp_pass_ok=true
grep -qE '^SMTP_PASSWORD=.+$' .env 2>/dev/null && smtp_pass_ok=true
if [ "$smtp_user_ok" != true ] || [ "$smtp_pass_ok" != true ]; then
  echo "WARN: No non-empty SMTP_USER / SMTP_PASSWORD in infra/.env or repo-root .env — transactional mail will not work."
fi

echo ""
echo "=== Pull latest (so Caddyfile has :80 block) ==="
git pull origin main --no-edit 2>/dev/null || true

echo ""
echo "=== Start stack ==="
[ -f .env ] || touch .env
docker compose --project-directory "$REPO/infra" --env-file "$REPO/infra/.env" -f "$REPO/infra/docker-compose.yml" up -d --build

echo ""
echo "=== Containers ==="
docker compose --project-directory "$REPO/infra" --env-file "$REPO/infra/.env" -f "$REPO/infra/docker-compose.yml" ps

echo ""
echo "=== Ports 80/443 ==="
ss -tlnp | grep -E ':80 |:443 ' || true

echo ""
echo "Done. Try http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_VPS_IP')"
