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

# LOCAL: Run PocketBase (from project root, so data dir is apps/pb/pb_data)
./apps/pb/pocketbase serve --dir=apps/pb

# In another terminal:
# LOCAL: Run Nuxt dev
cd apps/web && npm run dev
```

Open http://localhost:3000 (Nuxt) and http://localhost:8090 (PocketBase admin). Create collections in PocketBase admin per POCKETBASE_SETUP.md.
