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
