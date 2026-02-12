# Guardrails & Verification

## Common mistakes checklist

- **Mixing LOCAL vs VPS:** Never run `git push` from the VPS to your repo. Never run `docker compose` on your Mac to “deploy” — that’s on the VPS.
- **PocketBase URL:** On the VPS, `NUXT_PUBLIC_POCKETBASE_URL` must be the **public** URL (e.g. `https://pb.webrankingreports.com`), not `http://pb:8090`. The browser calls it, so it must be reachable from the client.
- **DNS:** Both `webrankingreports.com` and `pb.webrankingreports.com` must point (A records) to your VPS IP before Caddy can get SSL.
- **Collections order:** Create PocketBase collections in order: **sites** (needs `users`), then **integrations** and **reports** (need `sites`). Otherwise relation fields fail.
- **Auth rules:** If you get 403 on sites/integrations/reports, check that list/view/create/update/delete rules use `@request.auth.id` and (for integrations/reports) `site.user = @request.auth.id`.
- **CORS:** PocketBase allows requests from your Nuxt origin. If you use a different frontend URL, add it in PocketBase Admin → Settings → API rules or CORS if needed.
- **Forgetting to create collections:** The app expects `sites`, `integrations`, and `reports`. Create them in the PocketBase Admin UI (see POCKETBASE_SETUP.md) before using the app.

---

## How to verify it works

### LOCAL

1. **PocketBase:** Run `./apps/pb/pocketbase serve --dir=apps/pb`. Open http://127.0.0.1:8090/_/ — admin UI loads. Create collections (sites, integrations, reports) per POCKETBASE_SETUP.md.
2. **Nuxt:** In `apps/web`, run `npm run dev`. Open http://localhost:3000 — you are redirected to login.
3. **Register:** Sign up with email/password. You should land on the dashboard.
4. **Sites:** Click “Add Site”, enter name and domain. Site appears in the list. Click the site → Site Detail.
5. **Integrations:** On Site Detail, you see integration cards. Click “Connect” on one → status becomes “Connected”. Refresh; it stays connected.

### VPS (after deploy)

1. **URLs:**  
   - https://webrankingreports.com → Nuxt app (login/dashboard).  
   - https://pb.webrankingreports.com → PocketBase (API; you may see a simple response or 404 for `/`, admin at `/_/`).
2. **Auth:** Register and log in at https://webrankingreports.com. Create a site and connect an integration. No console errors; data persists after refresh.
3. **SSL:** Browser shows a valid lock for both domains (Caddy auto-HTTPS).

If any step fails, check: DNS, `infra/.env`, Docker logs (`docker compose -f infra/docker-compose.yml logs -f`), and PocketBase collection rules.
