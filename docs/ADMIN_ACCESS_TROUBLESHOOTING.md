# Admin access troubleshooting (admin@vma.agency)

There are **two different accounts** involved in “admin” access:

| Account | Where you use it | Purpose |
|--------|-------------------|--------|
| **PocketBase admin** | https://pb.webrankingreports.com/_/ | PB dashboard; server uses same credentials via `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD` in `infra/.env` to talk to PocketBase. |
| **App user (e.g. admin@vma.agency)** | https://webrankingreports.com (Sign in) | Log in to the app. If this user’s email is in `ADMIN_EMAILS`, they can open **Admin → Integrations**. |

---

## 1. You can’t log in to the **app** (webrankingreports.com) as admin@vma.agency

**Symptom:** Sign in at https://webrankingreports.com/auth/login fails (wrong password or unknown email).

**Fix: reset the app user’s password** using the script (you need PocketBase admin credentials):

```bash
cd apps/web
POCKETBASE_URL=https://pb.webrankingreports.com \
  POCKETBASE_ADMIN_EMAIL=your-pb-admin@email.com \
  POCKETBASE_ADMIN_PASSWORD=your-pb-admin-password \
  USER_EMAIL=admin@vma.agency \
  NEW_PASSWORD='your-new-secure-password' \
  node scripts/reset-app-user-password.mjs
```

Then sign in at https://webrankingreports.com with `admin@vma.agency` and the new password.

- If you don’t have PocketBase admin credentials, recover those first (see **3** below).

---

## 2. You’re logged in to the app but **Admin → Integrations** says “You don’t have access”

**Symptom:** You can open the dashboard but the Admin page shows “You don’t have access” (and possibly a hint).

**Causes and fixes:**

- **Your email isn’t in `ADMIN_EMAILS`**  
  On the **VPS**, edit `infra/.env` and set:
  ```bash
  ADMIN_EMAILS=admin@vma.agency
  ```
  Restart the web app:
  ```bash
  docker compose -f infra/docker-compose.yml up -d --force-recreate web
  ```

- **PocketBase admin login is failing** (hint mentions `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD`)  
  The server needs valid PocketBase admin credentials to check your email. On the VPS, set in `infra/.env`:
  ```bash
  PB_ADMIN_EMAIL=the-email-you-use-at-pb.webrankingreports.com/_/
  PB_ADMIN_PASSWORD=that-account-password
  ```
  Then:
  ```bash
  docker compose -f infra/docker-compose.yml up -d --force-recreate web
  ```

- **Web container can’t reach PocketBase** (hint about fetch/ECONNREFUSED)  
  In `infra/.env` on the VPS use the **internal** PocketBase URL:
  ```bash
  PB_URL=http://pb:8090
  ```
  Restart web as above.

---

## 3. You can’t log in to **PocketBase Admin** (https://pb.webrankingreports.com/_/)

**Symptom:** You don’t know or have lost the PocketBase admin password (or never set it).

**Option A – Password reset by email**  
If PocketBase has SMTP configured: on the admin login page use “Forgot password”, enter the admin email, and follow the email. Then log in and change the password if needed.

**Option B – Reset password via the database (no email needed)**  
On the **VPS**, with Docker:

1. Find the PocketBase data volume name:
   ```bash
   docker volume ls | grep pb_data
   ```
   (Often something like `infra_pb_data` or `web-ranking-reports_pb_data`.)

2. Set a temporary admin password (`123456`) for the given admin email:
   ```bash
   docker run --rm -v INFRA_PB_DATA_VOLUME_NAME:/data -it alpine sh -c "
     apk add sqlite --no-cache
     sqlite3 /data/data.db \"UPDATE _admins SET passwordHash=\\\"\$2a\$10\$xWbkSks7OiTmrri2DU6QSe6OAekcdqkOrkcI1wi4uiv9SU2HTlHoq\\\" WHERE email='YOUR_PB_ADMIN_EMAIL';\""
   ```
   Replace:
   - `INFRA_PB_DATA_VOLUME_NAME` with the volume name from step 1 (e.g. `infra_pb_data`).
   - `YOUR_PB_ADMIN_EMAIL` with the PocketBase admin email (e.g. `admin@vma.agency` if that’s your PB admin).

3. Log in at https://pb.webrankingreports.com/_/ with that email and password **123456**, then change the password (profile icon → Manage admins).

4. Update `infra/.env` on the VPS with the new password and restart the web container so the app can still use PB admin:
   ```bash
   PB_ADMIN_EMAIL=your-pb-admin@email.com
   PB_ADMIN_PASSWORD=your-new-password
   docker compose -f infra/docker-compose.yml up -d --force-recreate web
   ```

---

## Quick checklist

- [ ] Can you log in at **https://pb.webrankingreports.com/_/**?  
  - No → Use **§3** to reset PocketBase admin password.  
- [ ] Can you log in at **https://webrankingreports.com** as admin@vma.agency?  
  - No → Use **§1** (reset-app-user-password script) with your PB admin credentials.  
- [ ] Can you open **Admin → Integrations**?  
  - No → Use **§2** (check `ADMIN_EMAILS` and `PB_ADMIN_*` in `infra/.env`, restart web).
