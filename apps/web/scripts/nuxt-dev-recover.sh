#!/usr/bin/env bash
# Recover from ENOENT on .nuxt/dist/server/server.mjs: stale/zombie dev servers and torn .nuxt/dist.
# macOS: frees common Nuxt/Vite ports, removes .nuxt + Vite cache, runs prepare.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Nuxt dev recovery (macOS): stopping listeners on common dev ports…"
for port in 3000 3001 3004 3005 24678; do
  pids="$(lsof -ti ":$port" 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    echo "  port ${port}: killing PID(s) ${pids}"
    kill -9 ${pids} 2>/dev/null || true
  fi
done

echo "Removing .nuxt and node_modules/.vite…"
rm -rf .nuxt node_modules/.vite

echo "Running npm run prepare…"
npm run prepare

echo ""
echo "Done. Start exactly one dev server from apps/web:"
echo "  npm run dev"
echo "(Do not paste mangled commands like 'rm -rf .nuxtnpm run dev'.)"
