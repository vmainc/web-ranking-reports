# API authorization (v1)

Nuxt server routes under `apps/web/server/api` use one of these patterns:

| Pattern | Helper | Use |
|---------|--------|-----|
| Authenticated user | `getUserIdFromRequest` + `assertSiteAccess` / `assertSiteOwnership` | Site, report, GA4, Google, CRM data |
| Workspace CRM | `requireCrmOwnerId` + `crmRowOwnedByUser` | CRM collections |
| Admin only | `requireAdmin` / `assertAdmin` (see `admin/check.get.ts`) | Integrations, app_settings, billing admin |
| Admin SDK | `getAdminPb` + `adminAuth` | All PB writes; bypasses collection rules |
| Public (intentional) | Documented below | Health, OAuth callback, webhooks, forms |

## Intentionally public routes

- `GET /api/health` — deployment liveness (no secrets).
- `GET /api/forms/:id` — published form field definitions only.
- `POST /api/forms/:id/submit` — honeypot, rate limit, optional Turnstile.
- `GET /api/google/callback` — OAuth redirect (state signed with `STATE_SIGNING_SECRET`).
- `POST /api/stripe/webhook` — Stripe signature verification.
- `POST /api/webhooks/seoptimer` — per-user webhook key in body.
- `GET /api/reports/schedules/track/*` — opaque tracking tokens (no PII in URL).
- `POST /api/auth/invite-set-password` — signed invite token in body.
- `GET /api/agency/logo` — redirects to default or agency logo; white-label gated when caller identified.

All other routes require a valid PocketBase user JWT unless noted in the handler.

## GA4 / Google report proxies

`/api/ga4/*` and `/api/google/*` use `getGA4Context` or site-scoped helpers that call `assertSiteAccess` before calling Google APIs.

## Adding new routes

1. Default to `getUserIdFromRequest` — return 401 if missing.
2. For site-scoped data, call `assertSiteAccess` or `assertSiteOwnership`.
3. For admin settings, use the admin gate used in `server/api/admin/*`.
4. If truly public, add honeypot/rate limit/CAPTCHA and document the route here.
