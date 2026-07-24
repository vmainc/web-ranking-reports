#!/bin/sh
# Create PocketBase proposal collections (proposals, proposal_items, proposal_products)
# and sites.lifecycle. Safe to re-run.
#
# Production PocketBase uses --migrationsDir=/pb_data/pb_migrations_empty, so JS migrations
# under apps/pb/pb_migrations are NOT applied automatically. Use this script instead.
#
# From repo root on the VPS:
#   chmod +x infra/run-proposal-collections.sh
#   ./infra/run-proposal-collections.sh
set -e
cd "$(dirname "$0")/.."

if [ ! -f "infra/.env" ]; then
  echo "Missing infra/.env. Create it with PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD."
  exit 1
fi

# Do not `source` infra/.env (it can contain values that break /bin/sh).
# Parse only the keys we need.
get_env() {
  # Usage: get_env KEY
  grep -E "^${1}=" infra/.env 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//'
}

PB_ADMIN_EMAIL="$(get_env PB_ADMIN_EMAIL)"
PB_ADMIN_PASSWORD="$(get_env PB_ADMIN_PASSWORD)"
POCKETBASE_ADMIN_EMAIL="$(get_env POCKETBASE_ADMIN_EMAIL)"
POCKETBASE_ADMIN_PASSWORD="$(get_env POCKETBASE_ADMIN_PASSWORD)"

# Always hit PocketBase on the Docker network (ignore public https URL from .env).
export PB_URL="http://pb:8090"
export POCKETBASE_URL="http://pb:8090"

if [ -z "$POCKETBASE_ADMIN_EMAIL" ] && [ -n "$PB_ADMIN_EMAIL" ]; then
  export POCKETBASE_ADMIN_EMAIL="$PB_ADMIN_EMAIL"
fi
if [ -z "$POCKETBASE_ADMIN_PASSWORD" ] && [ -n "$PB_ADMIN_PASSWORD" ]; then
  export POCKETBASE_ADMIN_PASSWORD="$PB_ADMIN_PASSWORD"
fi

if [ -z "$POCKETBASE_ADMIN_EMAIL" ] || [ -z "$POCKETBASE_ADMIN_PASSWORD" ]; then
  echo "Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD (or PB_ADMIN_*) in infra/.env"
  exit 1
fi

export POCKETBASE_ADMIN_EMAIL POCKETBASE_ADMIN_PASSWORD

NETWORK="infra_default"
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  NETWORK="web-ranking-reports_default"
fi
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  echo "Docker network not found. Start the stack first, then re-run."
  exit 1
fi

echo "Creating proposal collections via $POCKETBASE_URL (admin: $POCKETBASE_ADMIN_EMAIL)..."
docker run --rm \
  --network "$NETWORK" \
  -e PB_URL="$PB_URL" \
  -e POCKETBASE_URL="$POCKETBASE_URL" \
  -e POCKETBASE_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
  -e POCKETBASE_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
  -e PB_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
  -e PB_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
  -v "$(pwd):/repo" \
  -w /repo/apps/web \
  node:20-alpine \
  node scripts/create-proposal-collections.mjs

echo ""
echo "Verifying collections exist..."
docker run --rm \
  --network "$NETWORK" \
  -e PB_URL="$PB_URL" \
  -e POCKETBASE_URL="$POCKETBASE_URL" \
  -e POCKETBASE_ADMIN_EMAIL="$POCKETBASE_ADMIN_EMAIL" \
  -e POCKETBASE_ADMIN_PASSWORD="$POCKETBASE_ADMIN_PASSWORD" \
  node:20-alpine \
  node -e "
const url=process.env.POCKETBASE_URL;
const email=process.env.POCKETBASE_ADMIN_EMAIL;
const password=process.env.POCKETBASE_ADMIN_PASSWORD;
(async()=>{
  const auth=await fetch(url+'/api/admins/auth-with-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identity:email,password})});
  if(!auth.ok){console.error('Auth failed',await auth.text());process.exit(1)}
  const token=(await auth.json()).token;
  const list=await fetch(url+'/api/collections?perPage=500',{headers:{Authorization:token}});
  const raw=await list.json();
  const items=Array.isArray(raw)?raw:(raw.items||[]);
  for (const name of ['proposals','proposal_items','proposal_products']) {
    console.log(name+':', items.some(c=>c.name===name) ? 'OK' : 'MISSING');
  }
})().catch(e=>{console.error(e);process.exit(1)});
"

echo "Done. Hard-refresh /crm/proposals/settings and click Sync products now."
