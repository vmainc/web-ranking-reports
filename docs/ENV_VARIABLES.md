# Environment Variables

## LOCAL (development)

**File:** `apps/web/.env` (create from `.env.example`)

```env
# PocketBase URL — Nuxt talks to PB from the browser, so use a URL your machine can reach.
# If PB runs on your machine:
NUXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090
```

- **LOCAL:** Run PocketBase with `./apps/pb/pocketbase serve --dir=apps/pb` so the API is at `http://127.0.0.1:8090`.
- **LOCAL:** Run Nuxt with `npm run dev` in `apps/web`. It will use `NUXT_PUBLIC_POCKETBASE_URL` via `useRuntimeConfig().public.pocketbaseUrl`.

No secrets are required in the Nuxt app for MVP; auth is handled by PocketBase (email/password). Keep any future API keys server-side only (e.g. Nuxt server routes or PocketBase hooks).

---

## VPS (production)

**File:** `infra/.env` (copy from `infra/.env.example`)

```env
# Public URL the browser uses to call PocketBase (must be HTTPS in production)
NUXT_PUBLIC_POCKETBASE_URL=https://pb.webrankingreports.com
```

- **VPS:** Caddy serves Nuxt at `https://webrankingreports.com` and PocketBase at `https://pb.webrankingreports.com`.
- **VPS:** Docker Compose passes `NUXT_PUBLIC_POCKETBASE_URL` into the `web` service so the built Nuxt app points to the correct PB URL.

Optional override if you use different domains:

```env
WEBRANKINGREPORTS_DOMAIN=webrankingreports.com
POCKETBASE_SUBDOMAIN=pb
```

---

## Nuxt runtimeConfig usage

In the app, the PocketBase URL is read as:

- `useRuntimeConfig().public.pocketbaseUrl`

This is set in `nuxt.config.ts` from `process.env.NUXT_PUBLIC_POCKETBASE_URL` (with a default for local dev). The composable `usePocketbase()` uses this to create the PocketBase client.

---

## Agency Email Sending (Gmail)

Server-only variables for Agency → Email Sending (Google Gmail API). Not related to Analytics OAuth in Admin → Integrations.

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` | OAuth web client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret (never expose to the browser) |
| `GOOGLE_OAUTH_REDIRECT_URI` | Must match Google Cloud Console, e.g. `https://webrankingreports.com/api/agency/email-sending/google/callback` |
| `EMAIL_CREDENTIALS_ENCRYPTION_KEY` | Encrypts OAuth tokens at rest (`openssl rand -hex 32`) |

Also set `STATE_SIGNING_SECRET` (already required) so OAuth `state` cannot be forged.

Create collections once: `node apps/web/scripts/add-agency-email-integrations.mjs`

---

## Agency Meta / Facebook (Page Insights)

Server-only variables for Agency → Integrations → Meta. Tokens reuse `EMAIL_CREDENTIALS_ENCRYPTION_KEY`. See `docs/META_SOCIAL.md`.

| Variable | Purpose |
|----------|---------|
| `META_APP_ID` | Meta app id |
| `META_APP_SECRET` | Meta app secret (never expose to the browser) |
| `META_OAUTH_REDIRECT_URI` | Must match Meta dashboard, e.g. `https://webrankingreports.com/api/agency/integrations/meta/callback` |
| `META_GRAPH_API_VERSION` | Optional; default `v25.0` |
| `META_LOGIN_CONFIG_ID` | Optional Facebook Login for Business configuration id |
| `SOCIAL_FACEBOOK_CRON_ENABLED` | `true` to enable daily due-only Facebook Insights sync |

Create collections once: `node apps/web/scripts/add-social-meta-collections.mjs`
