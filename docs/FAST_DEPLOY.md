# Fast deploy (no Docker build on the VPS)

Normal deploys used to run `docker compose up -d --build web` **on the VPS**, which rebuilds Nuxt + Playwright every time (~3–5 minutes).

The fast path:

1. **GitHub Actions** builds the `web` image on push to `main` (with layer cache).
2. Image is pushed to **GitHub Container Registry** (GHCR).
3. The VPS **pulls** the image and restarts the container (~30 seconds).

PocketBase (`pb`) and Caddy are unchanged — only the Nuxt `web` service uses the prebuilt image.

---

## If GitHub Actions is configured (recommended)

After a one-time setup below, your workflow is:

```bash
# LOCAL
git push origin main
```

GitHub builds → pushes to GHCR → SSHs to the VPS → `docker pull` → restart. **No manual SSH required.**

Watch progress: GitHub → **Actions** → **Deploy to VPS**.

---

## One-time setup

### 1. GitHub Actions secrets & variables

**Secrets** (repo → Settings → Secrets and variables → Actions → Secrets):

| Secret | Value |
|--------|--------|
| `SSH_HOST` | VPS IP or hostname |
| `SSH_USER` | SSH user |
| `SSH_PRIVATE_KEY` | Private key (full PEM) |
| `GHCR_READ_TOKEN` | Classic PAT with `read:packages` (and `repo` if the package is private) |

**Variables**:

| Variable | Example |
|----------|---------|
| `DEPLOY_PATH` | `/root/web-ranking-reports` |
| `GHCR_USERNAME` | Your **personal** GitHub username (not `vmainc`) — used for `docker login` on the VPS |

Create `GHCR_READ_TOKEN`: GitHub → Settings → Developer settings → **Personal access tokens (classic)** → enable **`read:packages`** and **`repo`**. If `vmainc` uses SSO, click **Authorize** next to the token for that org.

### 2. VPS — log in to GHCR once

```bash
ssh your-user@your-vps
docker logout ghcr.io 2>/dev/null || true
docker login ghcr.io -u YOUR_PERSONAL_GITHUB_USERNAME
# Password: paste GHCR_READ_TOKEN (not your GitHub password)
```

Use your **personal GitHub account username**, not the org name `vmainc`.

### 3. VPS — enable fast deploy in `infra/.env`

```bash
cd ~/web-ranking-reports
nano infra/.env
```

Add:

```
USE_PREBUILT_WEB_IMAGE=true
WEB_IMAGE=ghcr.io/vmainc/web-ranking-reports-web
WEB_IMAGE_TAG=main
```

`WEB_IMAGE_TAG=main` always tracks the latest build from `main`. GitHub Actions deploy uses the exact commit SHA tag for each release.

### 4. Make the GHCR package pullable (fixes **403 Forbidden**)

After the first successful **build-image** job:

1. Open **https://github.com/orgs/vmainc/packages** → **web-ranking-reports-web**
2. **Package settings** → link to repo **`vmainc/web-ranking-reports`**
3. Under **Manage Actions access** / **Manage visibility**, ensure the repo (or your user) can **read** the package

Then on the VPS, log in with your **personal** GitHub username + PAT (see step 2), not `-u vmainc`.

---

## Manual fast deploy on the VPS

If you SSH in instead of waiting for Actions:

```bash
cd ~/web-ranking-reports
./infra/deploy.sh
```

With `USE_PREBUILT_WEB_IMAGE=true`, this runs `git pull` + `docker compose pull web` + restart — **no build**.

---

## Slow deploy (fallback)

If GHCR is unavailable or you changed the Dockerfile locally on the VPS:

```bash
# In infra/.env
USE_PREBUILT_WEB_IMAGE=false
```

Then:

```bash
./infra/deploy.sh
```

Or explicitly:

```bash
docker compose --project-directory ~/web-ranking-reports/infra \
  --env-file ~/web-ranking-reports/infra/.env \
  -f ~/web-ranking-reports/infra/docker-compose.yml \
  up -d --build --force-recreate web
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `403 Forbidden` on `docker pull` | Image exists; fix auth: `docker login` with **personal** GitHub username + PAT (`read:packages`, `repo`); authorize SSO for `vmainc`; link package to repo (step 4) |
| `not found` on `docker pull` | **build-image** has not succeeded yet, or wrong image name — use `ghcr.io/vmainc/web-ranking-reports-web:main` |
| Workflow fails in **~30 seconds** | Open **build-image** job log. Often: org **Actions → Read and write permissions** |
| `manifest unknown` | Wait for Actions **build-image** job to finish; or use `WEB_IMAGE_TAG=main` |
| Live site unchanged after push | Confirm Actions ran; VPS must pull — push alone does nothing without Actions or `./infra/deploy.sh` |
| Need to change only `infra/.env` | `docker compose ... up -d --no-build --force-recreate web` (no pull needed) |

Image tags on each deploy:

- `ghcr.io/vmainc/web-ranking-reports-web:main` — latest `main`
- `ghcr.io/vmainc/web-ranking-reports-web:<git-sha>` — exact commit
