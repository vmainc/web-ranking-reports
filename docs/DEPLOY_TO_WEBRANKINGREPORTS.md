# Get Web Ranking Reports live at webrankingreports.com

All steps are labeled **LOCAL** (your Mac) or **VPS** (InterServer Ubuntu server). Do them in order.

---

## 1. DNS (do this first)

**LOCAL:** In your domain registrar (where you manage webrankingreports.com):

- Add an **A record**: name **@** (or `webrankingreports.com`), value = **your VPS public IP**.
- Add an **A record**: name **pb**, value = **same VPS public IP**.

So both `webrankingreports.com` and `pb.webrankingreports.com` point to the VPS.  
Wait 5–30 minutes for DNS to propagate (optional: check with `dig webrankingreports.com` or an online DNS checker).

---

## 2. VPS: Install Docker + Compose (one-time)

**VPS:** SSH into your InterServer VPS (Ubuntu 22.04), then run:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
docker --version
docker compose version
```

---

## 3. VPS: Clone repo and set env

**VPS:**

```bash
cd ~
git clone https://github.com/vmainc/web-ranking-reports.git
cd web-ranking-reports
cp infra/.env.example infra/.env
```

Edit `infra/.env` so the Nuxt app can reach PocketBase over HTTPS:

```bash
nano infra/.env
```

Set at least (no quotes):

```
NUXT_PUBLIC_POCKETBASE_URL=https://pb.webrankingreports.com
APP_URL=https://webrankingreports.com
PB_URL=https://pb.webrankingreports.com
PB_ADMIN_EMAIL=your-pb-admin@email.com
PB_ADMIN_PASSWORD=your-pb-admin-password
STATE_SIGNING_SECRET=any-random-string-at-least-32-chars
```

`PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD` must match the admin you create in PocketBase Admin (step 5). The app uses them to read `app_settings` and manage integrations. `STATE_SIGNING_SECRET` is required for Google OAuth (e.g. generate with `openssl rand -hex 32`).

Save and exit (Ctrl+O, Enter, Ctrl+X).

---

## 4. VPS: Start the stack

**VPS:** From the repo root:

```bash
cd ~/web-ranking-reports
docker compose -f infra/docker-compose.yml up -d --build
```

First run will build the PocketBase image and the Nuxt app; it can take a few minutes. Then check:

```bash
docker compose -f infra/docker-compose.yml ps
```

You should see `caddy`, `web`, and `pb` running.

---

## 5. VPS: Create PocketBase admin + collections (first time only)

**Option A — Script (recommended)**

On the VPS you don’t have the same `.env` with admin credentials. Either:

- Copy your PocketBase admin email/password into a small env file on the VPS (e.g. `infra/.env.pb` with `POCKETBASE_ADMIN_EMAIL` and `POCKETBASE_ADMIN_PASSWORD`), then run the script from inside the `web` container or from a one-off node run; **or**
- Use Option B.

**Option B — Admin UI**

1. In your browser open **https://pb.webrankingreports.com/_/** (use HTTPS after Caddy has obtained certificates).
2. Create the **first admin** account (email + password). This is the PocketBase admin for production.
3. Create the three collections (**sites**, **integrations**, **reports**) with the same fields and API rules as in **docs/POCKETBASE_SETUP.md**, or run the create-collections script from your Mac against the production URL (see below).

**Running the create-collections script against production (LOCAL):**

If you want to run the script from your Mac and point it at the live PocketBase:

1. Create an admin in **https://pb.webrankingreports.com/_/** first (step 5 Option B step 2).
2. **LOCAL:** In `apps/web` create a one-off `.env.production` or set env and run:

```bash
cd "/Users/doughigson/Desktop/VMA/WEB RANKING REPORTS/apps/web"
POCKETBASE_URL=https://pb.webrankingreports.com POCKETBASE_ADMIN_EMAIL=your@admin.email POCKETBASE_ADMIN_PASSWORD=your-admin-password node scripts/create-collections.mjs
```

Use the admin you created on **pb.webrankingreports.com**. The script creates **sites**, **integrations**, **reports**, **app_settings**, and **site_dashboard_settings**. If you already had some collections, it only adds the missing ones.

**Google OAuth (required for Connect Google / GA4):** After collections exist, add the OAuth config in PocketBase:

1. Open **https://pb.webrankingreports.com/_/** → **Collections** → **app_settings**.
2. Create a record:
   - **key:** `google_oauth`
   - **value:** (JSON)  
     `{ "client_id": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com", "client_secret": "YOUR_CLIENT_SECRET", "redirect_uri": "https://webrankingreports.com/api/google/callback" }`
3. Get `client_id` and `client_secret` from [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client (Web application). Add `https://webrankingreports.com/api/google/callback` to authorized redirect URIs.

Without this record and the env vars above, `/api/google/status` and `/api/google/auth-url` will return **500** and the dashboard “Connect Google” flow will fail.

---

## 6. Check the site

**LOCAL:** In your browser:

- **https://webrankingreports.com** → Nuxt app (login/register, dashboard).
- **https://pb.webrankingreports.com/_/** → PocketBase Admin (admin login).

If the Nuxt app shows “redirecting” or doesn’t load, wait a minute for Caddy to get SSL and for the web container to finish building. Check logs:

**VPS:**

```bash
docker compose -f infra/docker-compose.yml logs -f web
docker compose -f infra/docker-compose.yml logs -f caddy
```

---

## Summary

| Step | Where | What |
|------|--------|------|
| 1 | LOCAL (registrar) | A records for webrankingreports.com and pb.webrankingreports.com → VPS IP |
| 2 | VPS | Install Docker + Docker Compose |
| 3 | VPS | git clone, cp infra/.env.example infra/.env, set NUXT_PUBLIC_POCKETBASE_URL |
| 4 | VPS | docker compose -f infra/docker-compose.yml up -d --build |
| 5 | Browser + optional LOCAL | Create PB admin at pb.webrankingreports.com/_/ ; create collections (UI or script) |
| 6 | Browser | Open https://webrankingreports.com and https://pb.webrankingreports.com/_/ |

---

## After code changes

**VPS:** SSH in, then run (from anywhere in the repo, or from home):

```bash
cd ~/web-ranking-reports
git pull origin main --no-edit
docker compose -f infra/docker-compose.yml up -d --build --force-recreate web
```

Or use the deploy script:

```bash
cd ~/web-ranking-reports
chmod +x infra/deploy.sh
./infra/deploy.sh
```

PocketBase data is kept; only the web app is rebuilt and restarted. **If you only pushed to GitHub and didn’t run these on the VPS, the live site will not update.** After changing `infra/.env`, run the same command so the web container picks up the new env.

---

## Site down — run these on the VPS

**1. Check containers**

```bash
cd ~/web-ranking-reports
docker compose -f infra/docker-compose.yml ps
```

If `web` is **Exited** or **Restarting**, check logs:

```bash
docker compose -f infra/docker-compose.yml logs --tail 150 web
```

Look for `npm ERR!`, `Error:`, or build/runtime failures.

**2. Restart the stack**

```bash
cd ~/web-ranking-reports
docker compose -f infra/docker-compose.yml up -d --build --force-recreate web
docker compose -f infra/docker-compose.yml logs -f web
```

Leave the last command running to watch the web container. Wait until you see Nuxt listening on 3000 (or an error). Ctrl+C to stop following.

**3. If the web container keeps exiting**

- Ensure `infra/.env` exists and has at least: `NUXT_PUBLIC_POCKETBASE_URL`, `APP_URL`, `PB_URL`, `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`, `STATE_SIGNING_SECRET`.
- Ensure PocketBase is up: `docker compose -f infra/docker-compose.yml ps` — `pb` should be Up. If not: `docker compose -f infra/docker-compose.yml up -d pb` then rebuild web again.
- Build can take 2–5 minutes. If the container exits during `npm run build`, the logs will show the error (e.g. missing dependency, Node memory).

**4. Caddy / 502**

If the site returns 502 Bad Gateway, Caddy is up but the web container is not responding. Run step 1 and 2 above.

---

## Troubleshooting production errors

| What you see | Cause | Fix |
|--------------|--------|-----|
| **500** on `/api/google/status` or `/api/google/auth-url` | Missing server env or missing `app_settings` record | Set `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`, `STATE_SIGNING_SECRET` in `infra/.env`. In PocketBase Admin → **app_settings**, add record **key** `google_oauth`, **value** `{ "client_id": "...", "client_secret": "...", "redirect_uri": "https://webrankingreports.com/api/google/callback" }`. Then `docker compose -f infra/docker-compose.yml up -d --build web`. |
| **404** on `pb..../api/collections/site_dashboard_settings/records` | Collection doesn’t exist on production | Run the create-collections script against production (see step 5). It creates `site_dashboard_settings` and `app_settings` if missing. |
| **400** on `auth-with-password` | Login failed (wrong email/password or bad request) | User should check credentials. If it persists, check PocketBase logs and that the **users** collection and auth rules are correct. |
| **SES Removing unpermitted intrinsics** in console | Browser extension (e.g. lockdown) | Harmless; can ignore. |
