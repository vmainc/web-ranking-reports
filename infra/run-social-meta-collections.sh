#!/bin/sh
# Create PocketBase collections for Meta / Facebook social tracking:
#   agency_integrations, site_social_connections, social_metric_snapshots
#
# Production PocketBase uses --migrationsDir=/pb_data/pb_migrations_empty, so
# apps/pb/pb_migrations/1780800000_social_meta_collections.js is NOT applied on
# pb restart. Use this idempotent admin-API script instead (same pattern as
# run-agency-email-collections.sh / run-subscriptions-migrations.sh).
#
# From repo root on the VPS, AFTER a PocketBase backup:
#   chmod +x infra/run-social-meta-collections.sh
#   ./infra/run-social-meta-collections.sh
set -e
cd "$(dirname "$0")/.."

if [ ! -f "infra/.env" ]; then
  echo "Missing infra/.env. Create it with PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD."
  exit 1
fi

if [ ! -f "apps/web/scripts/add-social-meta-collections.mjs" ]; then
  echo "Missing apps/web/scripts/add-social-meta-collections.mjs — git pull origin main first."
  exit 1
fi

get_env() {
  grep -E "^${1}=" infra/.env 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//'
}

PB_ADMIN_EMAIL="$(get_env PB_ADMIN_EMAIL)"
PB_ADMIN_PASSWORD="$(get_env PB_ADMIN_PASSWORD)"
POCKETBASE_ADMIN_EMAIL="$(get_env POCKETBASE_ADMIN_EMAIL)"
POCKETBASE_ADMIN_PASSWORD="$(get_env POCKETBASE_ADMIN_PASSWORD)"

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

echo "Creating Meta/social collections via $POCKETBASE_URL (admin: $POCKETBASE_ADMIN_EMAIL)..."
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
  node scripts/add-social-meta-collections.mjs

echo ""
echo "Verifying collections and unique indexes (no record data)..."
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
  if(!auth.ok){console.error('Auth failed');process.exit(1)}
  const token=(await auth.json()).token;
  const list=await fetch(url+'/api/collections?perPage=500',{headers:{Authorization:token}});
  const raw=await list.json();
  const items=Array.isArray(raw)?raw:(raw.items||[]);
  const need={
    agency_integrations: 'idx_agency_integrations_agency_provider',
    site_social_connections: 'idx_site_social_conn_site_asset',
    social_metric_snapshots: 'idx_social_metric_snapshots_dedupe',
  };
  let missing=false;
  for (const [name, idx] of Object.entries(need)) {
    const col=items.find(c=>c.name===name);
    if(!col){ console.log(name+': MISSING'); missing=true; continue; }
    const indexes=Array.isArray(col.indexes)?col.indexes.join(' '):'';
    const hasIdx=indexes.includes(idx);
    console.log(name+': OK'+(hasIdx?' (unique index present)':' (unique index not listed — check Admin UI)'));
  }
  if(missing) process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
"

echo "Done. Recreate the web container if it cached missing-collection errors."
