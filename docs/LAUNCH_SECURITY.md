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

See **Collection rule strategy** section below (updated by migration audit).

## Public forms

When `TURNSTILE_SECRET_KEY` and `NUXT_PUBLIC_TURNSTILE_SITE_KEY` are set, public lead/contact endpoints require Turnstile. When unset, honeypot + rate limiting still apply (local dev unchanged).

---

## Collection rule strategy

*(Completed in Prompt 4 — see git history for migration file names.)*

- **app_settings**, integration secrets: admin/server only; no client list/view.
- **sites**, **reports**, **CRM**, **subscriptions**: authenticated owner/workspace member access.
- **users**: self + admin rules as defined in migrations.
- **Public leads**: create-only for anonymous; no list/view of other records.

Apply migrations: restart PocketBase with `pb_migrations` mounted, or run documented migration scripts from `apps/web/scripts/`.
