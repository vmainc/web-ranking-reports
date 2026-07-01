# Launch security

Checklist for v1 production hardening. **Never commit real secrets** — use `.env` locally and `infra/.env` on the VPS only.

## Repo hygiene

- Copy `apps/web/.env.example` → `apps/web/.env` for local dev.
- Copy `infra/.env.example` → `infra/.env` on the server.
- Run before each release:

```bash
bash scripts/check-release-clean.sh
```

For CI or packaging tarballs without local build artifacts:

```bash
RELEASE_STRICT=1 bash scripts/check-release-clean.sh
```

## Required secret rotation (production launch)

Rotate **all** of the following when going live or if any value may have been exposed (git history, logs, screenshots, old VPS):

| Secret | Where used | Action |
|--------|------------|--------|
| **PocketBase admin password** | `PB_ADMIN_PASSWORD` / `POCKETBASE_ADMIN_PASSWORD` | Change in PocketBase admin UI; update `infra/.env` and redeploy web container. |
| **SMTP password** | `SMTP_PASSWORD` in Nuxt + PocketBase mailer | Generate new app password at your mail provider; update PocketBase → Settings → Mailer and `infra/.env`. |
| **STATE_SIGNING_SECRET** | Google OAuth state, signed tokens | `openssl rand -hex 32`; set in `infra/.env`; redeploy. Invalidates in-flight OAuth states. |
| **Invite token secret** | Team/client password-set links | `INVITE_PASSWORD_TOKEN_SECRET` (or same as `STATE_SIGNING_SECRET`); rotate with signing secret if shared. |
| **Stripe keys** | Checkout, portal, webhooks | Dashboard → Developers → roll **Secret key** and **Webhook signing secret**; update `infra/.env`; update webhook endpoint if URL changes. |
| **Google / API keys** | OAuth client secret (Admin integrations), PageSpeed, DataForSEO, Claude, Bing | Regenerate in each provider console; update Admin → Integrations or env vars. |

After rotation: redeploy (`infra/deploy.sh` or your pipeline), smoke-test login, Google connect, invite email, Stripe checkout, and one PDF export.

## Dependency audit (before deploy)

From repo root:

```bash
npm --prefix apps/web audit
npm --prefix apps/web run build
```

Address **high** and **critical** findings before launch. Re-run after dependency updates.

**March 2026 baseline:** Nuxt `3.21.8`, ECharts `^6.1.0`, Nodemailer `^9.0.3`. Run `npm audit fix` in `apps/web` when advisories appear; avoid `--force` unless you have reviewed breaking changes.

## PocketBase collection rules

**Apply migration:** `apps/pb/pb_migrations/1780400000_launch_collection_rules_hardening.js`

- **Docker production:** `pb_migrations` is mounted into the container; restart PocketBase (`docker compose … restart pb`) and watch logs for migration success.
- **Local:** from `apps/pb`, run `./pocketbase migrate` (or restart `npm run pb` if migrations auto-apply).

### Strategy (v1)

| Collection | Access |
|------------|--------|
| `app_settings`, `subscriptions`, `usage_limits`, `subscription_usage_events`, `agency` | **Admin SDK only** — all API rules empty (deny client JWT). |
| `sites`, `reports`, `integrations`, `rank_keywords`, CRM collections | Authenticated **site/workspace owner** (`user = @request.auth.id` or `site.user = …`). |
| `lead_submissions` | **No public create** via PB API; Nuxt `/api/forms/:id/submit` uses admin SDK + honeypot/rate limit/Turnstile. |
| `lead_forms` | Owners manage; public read of published forms via Nuxt only. |
| `report_schedules` | Site owner CRUD; cron worker uses admin SDK. |
| `client_site_access` | Client portal: client or owner may view. |

## Public forms

When `TURNSTILE_SECRET_KEY` and `NUXT_PUBLIC_TURNSTILE_SITE_KEY` are set, public lead/contact endpoints require Turnstile. When unset, honeypot + rate limiting still apply (local dev unchanged).

See [API_AUTH.md](./API_AUTH.md) for server route authorization patterns and intentionally public endpoints.
