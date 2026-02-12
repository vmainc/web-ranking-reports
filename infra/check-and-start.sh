#!/bin/bash
# Run on VPS (e.g. ssh root@163.245.212.8) from repo root:
#   cd ~/web-ranking-reports && bash infra/check-and-start.sh
set -e
echo "=== Docker ==="
docker --version 2>/dev/null || { echo "Docker not installed. See docs/DEPLOY_TO_WEBRANKINGREPORTS.md step 2."; exit 1; }
docker compose version 2>/dev/null || { echo "Docker Compose plugin not installed."; exit 1; }

echo ""
echo "=== Repo and env ==="
test -f infra/.env || { echo "infra/.env missing. Run: cp infra/.env.example infra/.env && nano infra/.env"; exit 1; }
grep -q NUXT_PUBLIC_POCKETBASE_URL infra/.env || echo "WARN: NUXT_PUBLIC_POCKETBASE_URL not set in infra/.env"

echo ""
echo "=== Pull latest (so Caddyfile has :80 block) ==="
git pull origin main --no-edit 2>/dev/null || true

echo ""
echo "=== Start stack ==="
docker compose -f infra/docker-compose.yml up -d --build

echo ""
echo "=== Containers ==="
docker compose -f infra/docker-compose.yml ps

echo ""
echo "=== Ports 80/443 ==="
ss -tlnp | grep -E ':80 |:443 ' || true

echo ""
echo "Done. Try http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_VPS_IP')"
