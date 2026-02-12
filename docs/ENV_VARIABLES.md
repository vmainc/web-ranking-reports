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
