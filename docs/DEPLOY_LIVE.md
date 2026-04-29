# Get latest code live

## 1. On your Mac (in project folder)

Commit and push:

```bash
cd /path/to/web-ranking-reports
git add -A
git status
git commit -m "Move site technologies to Site settings; CRM Outsourcing tab; 7-day summary; WooCommerce kill switch"
git push origin main
```

(If `git status` shows nothing to commit, you're already up to date — just run `git push origin main` if you have unpushed commits.)

## 2. On the VPS (after SSH)

SSH in, then run (use `&&` between commands — do not type the word `and`):

```bash
cd ~/web-ranking-reports
git pull origin main
docker compose --project-directory ~/web-ranking-reports/infra \
  --env-file ~/web-ranking-reports/infra/.env \
  -f ~/web-ranking-reports/infra/docker-compose.yml \
  up -d --build web
```

That pulls the latest code and rebuilds/restarts the web container. The live site will serve the new version after the build finishes.

## Automated report schedules (first-time on an older PocketBase)

If **Reports → Automated reports** returns **503** with “Report schedules collection not found”, create the collection against your live PocketBase (once per environment):

```bash
cd ~/web-ranking-reports
chmod +x infra/run-report-schedules-migrations.sh   # once
./infra/run-report-schedules-migrations.sh
```

This uses the same Docker network as the stack and passes **`infra/.env` to Docker with `--env-file`** (it is not shell-sourced, so odd `.env` lines that break `source` / `. ./infra/.env` under `/bin/sh` are fine). Ensure `PB_URL` (usually `http://pb:8090`) and `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD` are set like for `docker compose`. After it succeeds, reload the Reports page; `/api/reports/schedules/list` and `create` should work.

If you cannot use Docker on the host, run the Node scripts from a machine that can reach PocketBase, with env set:

```bash
cd /path/to/web-ranking-reports/apps/web
export PB_URL="https://YOUR_POCKETBASE_HOST"
export PB_ADMIN_EMAIL="…"
export PB_ADMIN_PASSWORD="…"
node scripts/add-report-schedules-collection.mjs
node scripts/upgrade-report-schedules-fields.mjs
```

**Important:** `docker compose … --build web` only packages what is **already on disk** in `~/web-ranking-reports`. If `git pull` fails or is skipped, you rebuild old code. If the server has stray edits or untracked files blocking pull, sync to GitHub exactly (destructive on the VPS clone only):

```bash
cd ~/web-ranking-reports
git fetch origin main
git clean -fd
git reset --hard origin/main
```

Then run the `docker compose … up -d --build web` block again. Use an SSH deploy key or `https://github.com/...` without embedding tokens in `git remote` (see server `~/.ssh/config` host `github.com-wrr` if configured).

**Team/client invite emails** require `SMTP_USER` and `SMTP_PASSWORD` in `infra/.env` (same mailbox as PocketBase → Settings → Mailer). Without them, invites create the user but mail fails. After editing `.env`, run the same `docker compose … up -d web` command with your `infra` paths (see `docs/DEPLOY_TO_WEBRANKINGREPORTS.md` §3).

## One-liner (VPS only)

From any directory after you've SSH'd into the server:

```bash
cd ~/web-ranking-reports && git pull origin main && docker compose --project-directory ~/web-ranking-reports/infra --env-file ~/web-ranking-reports/infra/.env -f ~/web-ranking-reports/infra/docker-compose.yml up -d --build web
```
