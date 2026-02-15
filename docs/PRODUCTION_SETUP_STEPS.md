# Production setup (webrankingreports.com) — step-by-step

Use this after the stack is running (Docker up). All commands are meant to be run in the place indicated.

---

## 1. VPS: Put real env vars in a file (not in the shell)

The web container reads from **infra/.env**. Setting variables in the shell (e.g. `PB_ADMIN_EMAIL=...`) does **not** pass them into Docker.

**On the VPS** (SSH):

```bash
cd ~/web-ranking-reports
nano infra/.env
```

In the file, set **real** values (replace placeholders):

- `PB_ADMIN_EMAIL` = the email you use to log in to https://pb.webrankingreports.com/_/
- `PB_ADMIN_PASSWORD` = that admin’s password
- `STATE_SIGNING_SECRET` = a long random string (e.g. run `openssl rand -hex 32` and paste the result)

Example (no quotes, no spaces around `=`):

```
NUXT_PUBLIC_POCKETBASE_URL=https://pb.webrankingreports.com
APP_URL=https://webrankingreports.com
PB_URL=https://pb.webrankingreports.com
PB_ADMIN_EMAIL=admin@yourdomain.com
PB_ADMIN_PASSWORD=yourActualPbAdminPassword
STATE_SIGNING_SECRET=paste_output_of_openssl_rand_hex_32_here
```

Save (Ctrl+O, Enter) and exit (Ctrl+X).

Then restart the web app so it picks up the file:

```bash
docker compose -f infra/docker-compose.yml up -d --build web
```

---

## 2. Create missing PocketBase collections

The **create-collections** script must run in an environment that has **Node** and the repo. Two options:

### Option A — Run from your Mac (easiest)

On your **Mac** (in Terminal), from the project folder:

```bash
cd "/Users/doughigson/Desktop/VMA/WEB RANKING REPORTS/apps/web"
POCKETBASE_URL=https://pb.webrankingreports.com \
  POCKETBASE_ADMIN_EMAIL=yourRealPbAdmin@email.com \
  POCKETBASE_ADMIN_PASSWORD=yourRealPbAdminPassword \
  node scripts/create-collections.mjs
```

Use the **same** PocketBase admin email/password you put in `infra/.env` on the VPS. This creates any missing collections (e.g. `site_dashboard_settings`, `app_settings`) on production PocketBase.

### Option B — Run inside the web container on the VPS

On the **VPS**:

```bash
cd ~/web-ranking-reports
docker compose -f infra/docker-compose.yml run --rm web sh -c "node scripts/create-collections.mjs"
```

The script will use env from `infra/.env` (PB_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD). So those must already be set in `infra/.env` as in step 1. If the script can’t read them, set them when running:

```bash
docker compose -f infra/docker-compose.yml run --rm -e POCKETBASE_URL=https://pb.webrankingreports.com -e POCKETBASE_ADMIN_EMAIL=your@email.com -e POCKETBASE_ADMIN_PASSWORD=yourPassword web sh -c "node scripts/create-collections.mjs"
```

---

## 3. Add Google OAuth in PocketBase (in the browser)

The JSON with `client_id`, `client_secret`, `redirect_uri` is **not** pasted into the terminal. You add it in the PocketBase Admin UI.

1. Open **https://pb.webrankingreports.com/_/** in your browser and log in as admin.
2. Go to **Collections** → **app_settings**.
3. **Create** a new record:
   - **key:** `google_oauth`
   - **value:** (click into the JSON field and paste):

```json
{
  "client_id": "YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com",
  "client_secret": "YOUR_ACTUAL_CLIENT_SECRET",
  "redirect_uri": "https://webrankingreports.com/api/google/callback"
}
```

Replace `YOUR_ACTUAL_CLIENT_ID` and `YOUR_ACTUAL_CLIENT_SECRET` with the values from [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your OAuth 2.0 Client (Web application). Add `https://webrankingreports.com/api/google/callback` to **Authorized redirect URIs**.

4. Save the record.

---

## 4. Google Cloud: Enable APIs (required for property selection)

For **Connect Google** and **property selection** to work like dev:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → select the project with your OAuth client
2. **APIs & Services** → **Library**
3. Enable:
   - **Google Analytics Admin API** (for listing properties)
   - **Google Analytics Data API** (for dashboard/reports)

---

## Quick reference

| Step | Where    | What |
|------|----------|------|
| 1    | VPS      | Edit `infra/.env` with real PB admin + STATE_SIGNING_SECRET; `docker compose ... up -d --build web` |
| 2    | Mac or VPS | Run create-collections script (Node + repo) so production PB has all collections |
| 3    | Browser  | PocketBase Admin or Admin → Integrations: add `google_oauth` with client_id, client_secret, redirect_uri |
| 4    | GCP      | Enable Analytics Admin API + Analytics Data API for your OAuth project |

After step 1, `/api/google/status` may still 500 until step 3 is done (and step 2 if `app_settings` didn’t exist).
