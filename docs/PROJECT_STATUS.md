# Web Ranking Reports — Project status (for handoff / next-step prompts)

**Date:** February 2025  
**Live:** https://webrankingreports.com | https://pb.webrankingreports.com  
**Repo:** https://github.com/vmainc/web-ranking-reports (monorepo)

---

## What it is

SaaS app: **Web Ranking Reports** — users sign up, add sites (by name + domain), and manage integrations (Google Analytics, Search Console, Lighthouse, etc.) and reports. MVP scope: auth, dashboard, site list, add/edit/delete site, site detail page with integration cards (Connect/Disconnect stubs).

---

## Tech stack

- **Frontend:** Nuxt 3 (Vue 3, TypeScript), Tailwind, composables + services for auth/sites/integrations
- **Backend / DB / Auth:** PocketBase (single backend for REST API, auth, and SQLite DB)
- **Infra:** Docker Compose on a single VPS (Ubuntu); Caddy for reverse proxy + automatic HTTPS (Let’s Encrypt)
- **Deploy:** VPS at InterServer, IP 163.245.212.8; DNS at 20i (webrankingreports.com, pb.webrankingreports.com → same IP)

---

## What’s done and working

- **App:** Register, login, protected routes, dashboard (sites list), “Add Site” modal (name + domain), site detail page with integration cards (Connect/Disconnect are stubs). All wired to PocketBase.
- **PocketBase:** Collections **users** (built-in), **sites**, **integrations**, **reports** with user-scoped API rules. Production PB at pb.webrankingreports.com has same admin credentials as local; collections can be created via script `apps/web/scripts/create-collections.mjs` (run once per environment).
- **Infra:** Caddy serves webrankingreports.com → Nuxt (port 3000), pb.webrankingreports.com → PocketBase (8090). SSL working after fixing DNS (removed AAAA records at 20i so ACME validation hit the VPS over IPv4).
- **Fixes applied:** Lockfile fix for `npm ci` (commander/svgo); `npm ci --include=dev` in Docker so Tailwind module installs; PocketBase base URL normalized in composable to avoid `//` 404s; DNS/SSL troubleshooting documented.

---

## Repo layout

- `apps/web` — Nuxt app (pages, components, composables, services, `scripts/create-collections.mjs`)
- `apps/pb` — (optional) PocketBase migrations / config
- `infra/` — `docker-compose.yml`, `Caddyfile`, `Dockerfile.pb`, `.env` (and `.env.example`)
- `docs/` — DEPLOY_TO_WEBRANKINGREPORTS.md, POCKETBASE_SETUP.md, DNS_TROUBLESHOOTING.md, CREATE_COLLECTIONS_PRODUCTION.md, GIT_WORKFLOW.md, this file

---

## Current state (as of this status)

- **Live site:** https://webrankingreports.com — login and dashboard work.
- **PocketBase:** Production PB is up; if “Add Site” still 404s on `sites/records`, run the create-collections script once from Mac against `POCKETBASE_URL=https://pb.webrankingreports.com` (same admin as local).
- **Codebase:** Main branch is deployable; deploy flow: push to GitHub, on VPS `git pull` then `docker compose -f infra/docker-compose.yml up -d --build web` (and `--force-recreate web` if needed to pick up new build).

---

## Possible next steps (for prompt engineering)

- **Product:** Real integration flows (e.g. Google OAuth for Analytics/Search Console), report generation, email or export.
- **DevEx:** Remove Caddyfile `:80` block (IP access no longer needed), add CI (e.g. GitHub Actions) to run tests/lint and optionally deploy.
- **Ops:** Backups for PocketBase data, basic monitoring/health checks, or staging environment.
- **UX:** Onboarding, empty states, loading/error handling, or accessibility pass.

---

## How to use this for a “next step” prompt

Give this file (or a shortened version) to ChatGPT and add something like:

- “Using this project status, write a clear, step-by-step prompt I can give to Cursor (or an AI coder) to [e.g. implement Google Search Console OAuth] / [e.g. add a staging deploy] / [e.g. add backups for PocketBase],”  
  or  
- “Suggest 3 concrete next features or tasks, with a one-paragraph prompt for each that I can paste into Cursor.”

Adjust the “next steps” list above to match what you actually want to do next.
