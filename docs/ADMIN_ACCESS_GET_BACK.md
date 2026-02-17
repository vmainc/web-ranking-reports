# Get admin access back — checklist

Do these on the **VPS** (SSH in first). The web container must get `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`, and `ADMIN_EMAILS` from **infra/.env**. Running Compose from **inside infra/** forces that.

---

## Step 1 — Run Compose from `infra/` so it uses `infra/.env`

```bash
cd ~/web-ranking-reports/infra
docker compose -f docker-compose.yml up -d --force-recreate web
```

(Using the repo root with `-f infra/docker-compose.yml` can make Compose load the wrong `.env` on some setups; running from `infra/` avoids that.)

---

## Step 2 — Check the web container actually has the vars

```bash
cd ~/web-ranking-reports/infra
docker compose -f docker-compose.yml exec web env | grep -E 'PB_ADMIN_EMAIL|PB_ADMIN_PASSWORD|ADMIN_EMAILS'
```

You should see:
- `PB_ADMIN_EMAIL=admin@vma.agency`
- `PB_ADMIN_PASSWORD=...` (your password)
- `ADMIN_EMAILS=admin@vma.agency`

If any are **empty or missing**, fix **infra/.env**:

- No spaces around `=`.
- If the password contains `!`, put it in double quotes:  
  `PB_ADMIN_PASSWORD="VMAmadmia42O200!"`
- Use internal PB URL:  
  `PB_URL=http://pb:8090`

Then run Step 1 again.

---

## Step 3 — Try the app

1. **Sign in:** https://webrankingreports.com/auth/login with **admin@vma.agency** and your password.
2. **Admin page:** https://webrankingreports.com/admin/integrations (or Dashboard → Admin).

- If **sign-in fails** (wrong password), reset the app user password (see [ADMIN_ACCESS_TROUBLESHOOTING.md](./ADMIN_ACCESS_TROUBLESHOOTING.md) §1) using the script:
  ```bash
  cd apps/web
  POCKETBASE_URL=https://pb.webrankingreports.com \
    POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
    POCKETBASE_ADMIN_PASSWORD=your-pb-password \
    USER_EMAIL=admin@vma.agency \
    NEW_PASSWORD='your-new-app-password' \
    node scripts/reset-app-user-password.mjs
  ```
- If you’re signed in but **Admin says “You don’t have access”**, check the hint on the page and ensure Step 2 shows `ADMIN_EMAILS` and `PB_ADMIN_*` set.

---

## Step 4 — If it still fails, check logs

```bash
cd ~/web-ranking-reports/infra
docker compose -f docker-compose.yml logs --tail=30 web
```

Look for `Admin check error` or `PB_ADMIN`. That message tells you what’s wrong.
