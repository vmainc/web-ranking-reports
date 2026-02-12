# Web Ranking Reports

SaaS at **webrankingreports.com**: manage sites and connect integrations (Google Analytics, Search Console, Lighthouse, Google Business Profile, Google Ads, WooCommerce) for ranking and reporting.

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

1. **LOCAL:** From repo root, install and run PocketBase:
   ```bash
   # Download PocketBase binary into apps/pb if not present (see docs/LOCAL_COMMANDS.md)
   ./apps/pb/pocketbase serve --dir=apps/pb
   ```
2. In PocketBase Admin (http://127.0.0.1:8090/_/), create collections: **sites**, **integrations**, **reports** (see `docs/POCKETBASE_SETUP.md`).
3. **LOCAL:** In another terminal, run Nuxt:
   ```bash
   cd apps/web && cp .env.example .env && npm install && npm run dev
   ```
4. Open http://localhost:3000 → Register → Dashboard → Add Site → open a site → Integrations.

## Deploy (VPS)

See `infra/README.md` and `docs/GIT_WORKFLOW.md`. Summary: install Docker + Compose on Ubuntu 22.04, clone repo, set `infra/.env`, run `docker compose -f infra/docker-compose.yml up -d`. Point **webrankingreports.com** and **pb.webrankingreports.com** to the VPS.

## Commands label convention

- **LOCAL:** run on your computer  
- **VPS:** run on the server  
Never mix the two.
