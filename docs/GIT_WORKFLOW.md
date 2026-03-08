# Git Workflow

Commands are labeled **LOCAL:** (your computer) or **VPS:** (server).

---

## Minimal branch strategy

- **main** — default branch; deploy from here for MVP.
- Optional: use a **develop** or **staging** branch for work-in-progress; merge to `main` when ready to deploy.

---

## LOCAL: What to commit first

1. **LOCAL:** Create the repo (if not already):

   ```bash
   cd "/Users/doughigson/Desktop/VMA/WEB RANKING REPORTS"
   git init
   git add .
   git commit -m "Initial monorepo: Nuxt + PocketBase + infra"
   ```

2. **LOCAL:** Add a remote and push:

   ```bash
   git remote add origin <your-repo-url>
   git branch -M main
   git push -u origin main
   ```

Do **not** commit:

- `apps/web/.env` or `infra/.env`
- `apps/web/node_modules/`, `apps/web/.nuxt/`, `apps/web/.output/`
- `apps/pb/pb_data/` (PocketBase data)
- `apps/pb/pocketbase` (binary; optional to commit or add to .gitignore and document download in README)

Ensure `.gitignore` includes the above.

---

## VPS: Clone and pull

**First time on VPS:**

```bash
# VPS: Clone (replace with your repo URL)
git clone https://github.com/<you>/web-ranking-reports.git
cd web-ranking-reports
```

**Later, to deploy new code (copy-paste one-liner from any directory after SSH):**

```bash
cd ~/web-ranking-reports && git pull origin main && docker compose -f infra/docker-compose.yml up -d --build web
```

Or from repo root:

```bash
git pull origin main
docker compose -f infra/docker-compose.yml up -d --build web
```

---

## Workflow summary

1. **LOCAL:** Develop and test (PocketBase + Nuxt dev).
2. **LOCAL:** Commit and push to `main`.
3. **VPS:** `git pull origin main`, then restart/rebuild with Docker Compose as above.
