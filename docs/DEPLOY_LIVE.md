# Get latest code live

## 1. On your Mac (in project folder)

Commit and push:

```bash
cd "/Users/doughigson/Desktop/VMA/WEB RANKING REPORTS"
git add -A
git status
git commit -m "Move site technologies to Site settings; CRM Outsourcing tab; 7-day summary; WooCommerce kill switch"
git push origin main
```

(If `git status` shows nothing to commit, you're already up to date — just run `git push origin main` if you have unpushed commits.)

## 2. On the VPS (after SSH)

SSH in, then run:

```bash
cd ~/web-ranking-reports && git pull origin main && docker compose -f infra/docker-compose.yml up -d --build web
```

That pulls the latest code and rebuilds/restarts the web container. The live site will serve the new version after the build finishes.

## One-liner (VPS only)

From any directory after you've SSH'd into the server:

```bash
cd ~/web-ranking-reports && git pull origin main && docker compose -f infra/docker-compose.yml up -d --build web
```
