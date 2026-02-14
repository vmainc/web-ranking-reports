# Create PocketBase Collections on Production

If the dashboard shows "The requested resource wasn't found" or the console has **404** on `pb.webrankingreports.com/api/collections/sites/records`, the **sites** (and related) collections don't exist on the live PocketBase. Create them once as below.

---

## 1. Create a PocketBase admin (if you haven’t)

1. Open **https://pb.webrankingreports.com/_/** in your browser.
2. If you see “Create first admin”, enter an **email** and **password** and save. This is the **PocketBase admin** (not your app user). Remember these for step 2.
3. If you already have an admin, log in.

---

## 2. Run the create-collections script from your Mac

From your project, with the **admin** email/password from step 1:

```bash
cd "/Users/doughigson/Desktop/VMA/WEB RANKING REPORTS/apps/web"
POCKETBASE_URL=https://pb.webrankingreports.com \
  POCKETBASE_ADMIN_EMAIL=your-admin@email.com \
  POCKETBASE_ADMIN_PASSWORD=your-admin-password \
  node scripts/create-collections.mjs
```

Replace `your-admin@email.com` and `your-admin-password` with the PocketBase admin you created at pb.webrankingreports.com/_/.

You should see:

- `Created collection: sites`
- `Created collection: integrations`
- `Created collection: reports`
- `Done. Refresh PocketBase Admin → Collections to see sites, integrations, reports.`

---

## 3. Try the app again

Refresh **https://webrankingreports.com/dashboard** and click **Add Site** again. The 404s should be gone and adding a site should work.

---

**Alternative:** You can create the three collections by hand in **PocketBase Admin → Collections**, using the schema and API rules in **docs/POCKETBASE_SETUP.md**.
