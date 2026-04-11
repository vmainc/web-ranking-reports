# LOCAL: Scaffold Commands (run on your computer)

Run these in order. **Project root** = the folder that contains `apps/`, `infra/`, and `docs/` (e.g. `WEB RANKING REPORTS` or your clone `web-ranking-reports`).

If you are starting in an **empty** folder:

```bash
# LOCAL: Create project root and cd into it
mkdir -p web-ranking-reports && cd web-ranking-reports

# LOCAL: Create monorepo structure
mkdir -p apps/web apps/pb/schema apps/pb/pb_hooks apps/pb/pb_migrations
mkdir -p infra docs
```

If the repo **already has** the structure (e.g. you cloned or used this repo), skip the above and just run the steps below from the project root.

---

## 2) Scaffold Nuxt 3 + Tailwind (apps/web)

```bash
# LOCAL: From project root
cd apps/web

# LOCAL: Create Nuxt 3 app with Tailwind (use npx so you don't need global install)
npx nuxi@latest init . --packageManager npm

# LOCAL: Add Tailwind CSS module
npm install -D @nuxtjs/tailwindcss

# LOCAL: Add PocketBase JS SDK
npm install pocketbase

# LOCAL: Return to project root
cd ../..
```

If `nuxi init .` prompts about existing files, choose to merge/overwrite as needed. Then ensure `nuxt.config.ts` includes Tailwind (see apps/web/nuxt.config.ts in repo).

---

## 3) Add PocketBase binary (apps/pb)

```bash
# LOCAL: From project root
cd apps/pb

# LOCAL: Download PocketBase for your OS (macOS arm64 example; replace if different)
# macOS Apple Silicon:
curl -L -o pocketbase https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_0.22.22_darwin_arm64.zip
unzip -o pocketbase
chmod +x pocketbase

# macOS Intel:
# curl -L -o pocketbase.zip https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_0.22.22_darwin_amd64.zip
# unzip -o pocketbase.zip && mv pocketbase_* pocketbase && chmod +x pocketbase

# LOCAL: Return to project root
cd ../..
```

Use the correct archive for your OS from: https://github.com/pocketbase/pocketbase/releases

---

## 4) Verify structure

```bash
# LOCAL: From project root
ls -la apps/web apps/pb infra docs
ls apps/web/nuxt.config.ts apps/web/package.json
```

You should see Nuxt app in `apps/web`, PocketBase dir with `pocketbase` binary in `apps/pb`, and `infra` and `docs` folders.

---

## 5) Install dependencies and run locally

```bash
# LOCAL: Install web app deps
cd apps/web && npm install && cd ../..

# LOCAL: Run PocketBase from repo root (data + SQLite live in apps/pb/)
# Always set --migrationsDir so PocketBase does NOT pick up apps/pb_migrations/ by mistake
# (that sibling folder can re-apply old JS migrations and break a restored prod DB).
./apps/pb/pocketbase serve --dir=apps/pb --migrationsDir=apps/pb/pb_migrations

# Or: cd apps/web && npm run pb   (same flags via package.json)

# In another terminal:
# LOCAL: Run Nuxt dev
cd apps/web && npm run dev
```

Open **http://localhost:3000** (Nuxt) and **http://127.0.0.1:8090/_/** (PocketBase admin).  
Use `apps/web/.env` with `NUXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090` so the browser hits local PB.

If collections are missing on a fresh DB, create them per **POCKETBASE_SETUP.md** or run the collections script from **docs/POCKETBASE_UP_AND_DEPLOY.md**.

---

## 6) LOCAL: Sync PocketBase from the VPS (copy prod data to your Mac)

To work against **production data** on your Mac:

1. SSH must reach the server; Docker Compose must be running there (`pb` container up).
2. From **repo root** on your Mac:

```bash
chmod +x scripts/sync-pb-from-vps.sh
./scripts/sync-pb-from-vps.sh user@your-vps-host
```

If the repo on the VPS is not at `~/web-ranking-reports`:

```bash
SYNC_PB_REPO_ROOT=/root/web-ranking-reports ./scripts/sync-pb-from-vps.sh user@your-vps-host
```

The script backs up your current `apps/pb/data.db`, `logs.db`, and `storage/`, then unpacks the server’s `/pb_data` volume into `apps/pb/`.  
**Admin credentials** are whatever the VPS PocketBase uses (they live in the copied DB). Large `storage/` uploads can make the transfer slow.

Then start PocketBase and Nuxt as in step 5.
