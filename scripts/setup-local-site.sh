#!/usr/bin/env bash
# LOCAL: First-time setup for the Nuxt app + PocketBase on your machine (run from repo root).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"
PB_EXE="$ROOT/apps/pb/pocketbase"

echo "==> Web Ranking Reports — local setup"
echo "    Root: $ROOT"

if [[ ! -x "$PB_EXE" ]]; then
  echo ""
  echo "ERROR: PocketBase binary not found or not executable:"
  echo "       $PB_EXE"
  echo ""
  echo "Download the archive for your OS from:"
  echo "  https://github.com/pocketbase/pocketbase/releases"
  echo "Unpack so the executable is at: apps/pb/pocketbase"
  echo "See also: docs/LOCAL_COMMANDS.md (section \"Add PocketBase binary\")."
  exit 1
fi

if [[ ! -f "$WEB/.env" ]]; then
  cp "$WEB/.env.example" "$WEB/.env"
  echo ""
  echo "==> Created $WEB/.env from .env.example"
  echo "    Edit it and set at least:"
  echo "      PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD (same as PocketBase admin you create in step 3)"
  echo "      STATE_SIGNING_SECRET (any long random string)"
  echo "      ADMIN_EMAILS (your email for in-app admin checks)"
else
  echo ""
  echo "==> $WEB/.env already exists (left unchanged)"
fi

echo ""
echo "==> Installing npm dependencies (apps/web)…"
npm install --prefix "$WEB"

echo ""
echo "==> Done."
echo ""
echo "Next steps:"
echo "  1) Start PocketBase + Nuxt together (recommended):"
echo "       cd \"$ROOT\" && npm run dev:stack"
echo "     Or from apps/web only:  cd apps/web && npm run dev:stack"
echo ""
echo "  2) First time PocketBase: open http://127.0.0.1:8090/_/ and create the admin account."
echo "     Use the same email/password in apps/web/.env as PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD."
echo ""
echo "  3) Open the app: http://localhost:3000"
echo ""
echo "More detail: docs/LOCAL_COMMANDS.md and README.md (Quick start)."
