# Google OAuth (Connect once for GA + GSC)

One Google sign-in connects both **Google Analytics** and **Google Search Console** for a site. Tokens are stored server-side in PocketBase (`integrations.config_json` on the `google_analytics` anchor record); the client never sees tokens.

---

## 1. Create the `app_settings` collection

Run the create-collections script once (it now creates `app_settings` if missing):

```bash
cd apps/web
POCKETBASE_URL=https://pb.webrankingreports.com POCKETBASE_ADMIN_EMAIL=... POCKETBASE_ADMIN_PASSWORD=... node scripts/create-collections.mjs
```

---

## 2. Environment variables

**apps/web/.env** (local) and **infra/.env** (VPS) must include:

| Variable | Description |
|----------|-------------|
| `APP_URL` | App origin, e.g. `https://webrankingreports.com` or `http://localhost:3000` |
| `PB_URL` | PocketBase URL (same as NUXT_PUBLIC_POCKETBASE_URL for server calls) |
| `PB_ADMIN_EMAIL` | PocketBase admin email (for server-side PB access) |
| `PB_ADMIN_PASSWORD` | PocketBase admin password |
| `STATE_SIGNING_SECRET` | Long random string used to sign OAuth `state` (e.g. `openssl rand -hex 32`) |
| `ADMIN_EMAILS` | Comma-separated emails allowed to open `/admin/integrations` |

---

## 3. Google Cloud OAuth client

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create an **OAuth 2.0 Client ID** (Web application).
3. **Authorized redirect URIs**: add exactly  
   `https://webrankingreports.com/api/google/callback`  
   (or `http://localhost:3000/api/google/callback` for local).
4. Copy **Client ID** and **Client secret**.

---

## 4. Admin UI: save client id/secret

1. Log in to the app with a user whose email is in `ADMIN_EMAILS`.
2. Open **/admin/integrations**.
3. Enter **Client ID** and **Client secret**, then **Save**.  
   The page shows the **Redirect URI** to use in Google Cloud.

---

## 5. User flow

- On a **site detail** page, **Connect** on either **Google Analytics** or **Google Search Console** redirects to Google; after consent, both providers are set to **connected**.
- **Disconnect** clears both for that site.
- Status is loaded from **GET /api/google/status**; tokens are never sent to the client.

---

## Server routes (reference)

| Route | Purpose |
|-------|---------|
| `GET /api/google/auth-url?siteId=` | Return Google OAuth URL (requires auth) |
| `GET /api/google/callback?code=&state=` | Exchange code, store tokens, redirect to site |
| `GET /api/google/status?siteId=` | Return connected state and email (no tokens) |
| `POST /api/google/disconnect` | Body `{ siteId }`; disconnect GA + GSC for site |
| `POST /api/admin/settings/google-oauth` | Body `{ client_id, client_secret }`; admin only |
| `GET /api/admin/check` | Returns `{ allowed }` for admin page gate |
