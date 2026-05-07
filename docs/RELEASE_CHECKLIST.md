# Release Checklist (Canonical)

## 1) LOCAL — Commit and push to `main`

```bash
cd "/Users/doughigson/dev/web-ranking-reports"
git status
git add -A
git commit -m "YOUR RELEASE MESSAGE"
git push origin main
```

## 2) Optional — Verify GitHub Action deploy

```bash
# Open GitHub Actions and confirm "Deploy to VPS" passed:
# https://github.com/vmainc/web-ranking-reports/actions
```

## 3) VPS — Canonical deploy (safe to run even if Action already ran)

```bash
ssh <SSH_USER>@<SSH_HOST>
cd ~/web-ranking-reports
git fetch origin main
git checkout main
git pull --ff-only origin main
docker compose --project-directory ~/web-ranking-reports/infra --env-file ~/web-ranking-reports/infra/.env -f ~/web-ranking-reports/infra/docker-compose.yml up -d --build web
```

## 4) VPS — If PocketBase migrations/schema changed

```bash
cd ~/web-ranking-reports
docker compose -f infra/docker-compose.yml restart pb
```

## 5) VPS — Quick health checks

```bash
cd ~/web-ranking-reports
docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml logs --tail 100 web
docker compose -f infra/docker-compose.yml logs --tail 100 pb
docker compose -f infra/docker-compose.yml logs --tail 100 caddy
```

## 6) LOCAL — Smoke test URLs

```bash
open "https://webrankingreports.com"
open "https://pb.webrankingreports.com/_/"
```

## If deploy gets stuck (VPS)

```bash
cd ~/web-ranking-reports
git fetch origin main
git clean -fd
git reset --hard origin/main
docker compose --project-directory ~/web-ranking-reports/infra --env-file ~/web-ranking-reports/infra/.env -f ~/web-ranking-reports/infra/docker-compose.yml up -d --build web
```
