# Web Ranking Reports — Deployment (Docker Compose + Caddy)

All commands are labeled **LOCAL:** (your computer) or **VPS:** (InterServer Ubuntu 22.04).

---

## VPS: Install Docker and Docker Compose

Run once on a fresh Ubuntu 22.04 VPS (as root or with sudo):

```bash
# VPS: Update and install prerequisites
sudo apt-get update
sudo apt-get install -y ca-certificates curl

# VPS: Add Docker’s official GPG key and repo
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# VPS: Install Docker Engine and Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# VPS: Confirm
docker --version
docker compose version
```

---

## VPS: Deploy the stack

1. Clone or pull the repo on the VPS (see GIT_WORKFLOW.md).
2. Create env file and start:

```bash
# VPS: From the repo root (e.g. ~/web-ranking-reports)
cp infra/.env.example infra/.env
# Edit infra/.env if you need different domains or PB URL.

# VPS: Start all services (Caddy, Nuxt, PocketBase)
docker compose -f infra/docker-compose.yml up -d

# VPS: Check status
docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml logs -f
```

3. Point **webrankingreports.com** and **pb.webrankingreports.com** to your VPS IP (A records). Caddy will obtain SSL automatically.

---

## VPS: Bring stack down

```bash
# VPS: From repo root
docker compose -f infra/docker-compose.yml down
```

Data in the `pb_data` volume is kept. To remove volumes too:

```bash
# VPS: WARNING — deletes PocketBase data
docker compose -f infra/docker-compose.yml down -v
```

---

## VPS: Restart after code changes

After pulling new code:

```bash
# VPS: Rebuild and restart web (and anything that depends on it)
docker compose -f infra/docker-compose.yml up -d --build web
```

PocketBase data is persistent; no need to recreate the `pb` service unless you change its config.

---

## VPS: Apply new PocketBase migrations

`docker-compose.yml` mounts `apps/pb/pb_migrations` into the PB container. After `git pull`, **restart PocketBase** so it runs any new migration files.

```bash
# VPS: From repo root — pull, rebuild the Nuxt image, restart PocketBase (runs new migrations)
cd ~/web-ranking-reports
git pull origin main
docker compose -f infra/docker-compose.yml up -d --build web
docker compose -f infra/docker-compose.yml restart pb
```

Confirm migrations in the PB logs if needed: `docker compose -f infra/docker-compose.yml logs pb | tail -50`.

### Billing / Stripe (`subscriptions`, `usage_limits`)

Repo migrations under `apps/pb/pb_migrations/` include `1778705561_created_subscriptions.js` (and related files) for **fresh** PocketBase installs that run with a non-empty migrations directory.

On the current VPS image, PocketBase starts with **`--migrationsDir=/pb_data/pb_migrations_empty`**, so those files are **not** applied automatically. After deploy, run the admin API script once (idempotent):

```bash
chmod +x infra/run-subscriptions-migrations.sh   # once
./infra/run-subscriptions-migrations.sh
```

That creates missing collections, seeds `usage_limits` per plan, and adds trial/banner fields on `subscriptions` if an older row existed without them. Then set live Stripe price env vars in `infra/.env` / the web service (see `apps/web/.env.example`).

### Website audit form (`website_audit_leads`)

After deploying the embeddable audit form feature, create the collection once on production (idempotent):

```bash
chmod +x infra/run-website-audit-leads-collection.sh   # once
./infra/run-website-audit-leads-collection.sh
```

Then use **CRM → Website audit** in the app to copy iframe/script embed code for Breakdance sites. Prospect report emails use the same `SMTP_USER` / `SMTP_PASSWORD` as other transactional mail in `infra/.env`.

---

## VPS: Build fails with "not enough free space" or "apt/archives"

The web image installs Playwright/Chromium for PDF export and needs ~1–2 GB free during build. If the build fails with `E: You don't have enough free space in /var/cache/apt/archives/`:

```bash
# Free Docker disk (unused images, build cache)
docker system prune -af
docker builder prune -af
df -h   # confirm you have enough free space, then:
cd ~/web-ranking-reports && git pull origin main && docker compose -f infra/docker-compose.yml up -d --build web
```
