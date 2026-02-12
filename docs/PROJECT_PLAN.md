# Web Ranking Reports — Project Plan

## Product
SaaS at **webrankingreports.com**: users manage sites and connect integrations (GA, GSC, Lighthouse, GBP, Google Ads, WooCommerce) for ranking/reporting. Phase 1 = auth + sites CRUD + integrations UI skeleton.

## MVP Milestone

| # | Milestone | Scope |
|---|-----------|--------|
| 1 | **Auth** | Register, login, logout; PocketBase email/password; protected routes in Nuxt |
| 2 | **Sites CRUD** | List sites on dashboard; Add Site (name + domain); view Site Detail; delete optional later |
| 3 | **Integrations UI** | Site Detail page shows one card per provider (GA, GSC, Lighthouse, GBP, Google Ads, WooCommerce); "Connect" stores stub config + status in PocketBase; no real OAuth yet |

## Tech Stack
- **Frontend:** Nuxt 3 (TypeScript) + Tailwind CSS
- **Backend/DB:** PocketBase (auth, DB, files, rules)
- **Deploy:** Docker Compose + Caddy (auto SSL)
- **Repo:** Monorepo — `apps/web`, `apps/pb`, `infra`

## Out of Scope (post-MVP)
- Real OAuth for Google/GBP/WooCommerce
- Report generation and payload storage
- Multi-user/team or billing
