# Web Ranking Reports

SaaS at **webrankingreports.com**: manage sites and connect integrations (Google Analytics, Search Console, Lighthouse, Google Business Profile, Google Ads, WooCommerce) for ranking and reporting.

## Canonical Release Checklist

Use `docs/RELEASE_CHECKLIST.md` as the single source of truth for release commands.

## Stack

- **Frontend:** Nuxt 3 (TypeScript) + Tailwind CSS  
- **Backend/DB:** PocketBase (auth, DB, files, server-side rules)  
- **Deploy:** Docker Compose + Caddy (auto SSL)

## Repo layout

- `apps/web` — Nuxt 3 app  
- `apps/pb` — PocketBase (binary + schema reference)  
- `infra` — Docker Compose, Caddyfile, deploy  
- `docs` — Project plan, LOCAL/VPS commands, PocketBase setup, env, git workflow, guardrails  

## Quick start (LOCAL)

1. **One-time setup** (creates `apps/web/.env` if missing, installs deps, checks PocketBase binary):
   ```bash
   npm run setup:local
   ```
   Edit `apps/web/.env`: set `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`, `STATE_SIGNING_SECRET`, and `ADMIN_EMAILS` (see `apps/web/.env.example`). The PocketBase admin password must match the admin account you create in step 3.

2. **Run PocketBase + Nuxt** (single terminal; Ctrl+C stops both):
   ```bash
   npm run dev:stack
   ```
   Equivalent: `cd apps/web && npm run dev:stack`.

3. **PocketBase admin (first run only):** open http://127.0.0.1:8090/_/ and create the admin user. Use the same credentials in `apps/web/.env` as `PB_ADMIN_*`.

4. **Optional — copy live data** to your Mac: **`scripts/sync-pb-from-vps.sh`** (see `docs/LOCAL_COMMANDS.md`). Otherwise create collections per `docs/POCKETBASE_SETUP.md`.

5. Open http://localhost:3000 → Register → Dashboard → Add Site → open a site → Integrations.

## Deploy (VPS)

See `infra/README.md` and `docs/GIT_WORKFLOW.md`. Summary: install Docker + Compose on Ubuntu 22.04, clone repo, set `infra/.env`, run `docker compose -f infra/docker-compose.yml up -d`. Point **webrankingreports.com** and **pb.webrankingreports.com** to the VPS.

## Commands label convention

- **LOCAL:** run on your computer  
- **VPS:** run on the server  
Never mix the two.
