# PocketBase: Get Up and Running + Deploy (Step-by-Step)

Every command is labeled **LOCAL:** (your Mac) or **VPS:** (your InterServer Ubuntu server). Do not mix them.

---

## Part 1 — LOCAL: Get PocketBase running on your Mac

### Step 1.1 — Download the PocketBase binary

```bash
# LOCAL: Open Terminal and go to your project root (the folder that contains apps/)
cd "/Users/doughigson/Desktop/VMA/WEB RANKING REPORTS"

# LOCAL: Go into the PocketBase app folder
cd apps/pb

# LOCAL: Choose ONE — Apple Silicon (M1/M2/M3) or Intel Mac.
# If you get "bad CPU type in executable", you need the other version (Intel = amd64, Apple Silicon = arm64).
# Apple Silicon:
#   curl -L -o pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v0.22.22/pocketbase_0.22.22_darwin_arm64.zip"
# Intel Mac:
#   curl -L -o pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v0.22.22/pocketbase_0.22.22_darwin_amd64.zip"
curl -L -o pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v0.22.22/pocketbase_0.22.22_darwin_arm64.zip"
unzip -o pocketbase.zip
rm pocketbase.zip
chmod +x pocketbase
```

### Step 1.2 — Start PocketBase (collections are created automatically)

```bash
# LOCAL: From project root (folder that contains apps/)
cd "/Users/doughigson/Desktop/VMA/WEB RANKING REPORTS"

# LOCAL: Start PocketBase. Data is in apps/pb; migrations in apps/pb/pb_migrations run on startup and create sites, integrations, reports.
./apps/pb/pocketbase serve --dir=apps/pb
```

Leave this terminal open. You should see something like:
`Server started at http://127.0.0.1:8090`

**If the three collections (sites, integrations, reports) don’t appear:** run from the `apps/pb` directory so the default migrations path is used:
`cd apps/pb && ./pocketbase serve --dir=.`

### Step 1.3 — Open PocketBase Admin and create an admin user (first time only)

1. **LOCAL:** In your browser go to: **http://127.0.0.1:8090/_/**
2. The first time you open it, PocketBase will ask you to create an **admin** account (email + password). This is for the Admin UI only, not for your app users.
3. Create the admin account and log in.

### Step 1.4 — Create collections (sites, integrations, reports)

PocketBase 0.22 doesn’t support creating collections from the JS migration, so use **one** of these:

**Option A — Script (recommended)**  
From the project root, with PocketBase running and admin account created (Step 1.3):

```bash
# LOCAL: Set your admin email and password (the one you use for http://127.0.0.1:8090/_/)
export POCKETBASE_ADMIN_EMAIL="your-admin@example.com"
export POCKETBASE_ADMIN_PASSWORD="your-admin-password"
# Optional if not default:
# export POCKETBASE_URL="http://127.0.0.1:8090"

cd "/Users/doughigson/Desktop/VMA/WEB RANKING REPORTS/apps/web"
node scripts/create-collections.mjs
```

You should see: `Created collection: sites`, then `integrations`, then `reports`. Refresh the Admin UI → Collections.

**Option B — Manual**  
Create the three collections and their API rules by following **docs/POCKETBASE_SETUP.md** in the Admin UI.

PocketBase is now **up and running locally**. Your Nuxt app (when you run `npm run dev` in `apps/web`) will use it at `http://127.0.0.1:8090`.

---

## Part 2 — VPS: Install Docker and deploy the whole stack (Nuxt + PocketBase + Caddy)

These steps are for your **InterServer Ubuntu 22.04 VPS**. Run them over SSH.

### Step 2.1 — SSH into your VPS

```bash
# LOCAL: From your Mac (replace with your VPS IP and user)
ssh root@YOUR_VPS_IP
# Or: ssh youruser@YOUR_VPS_IP
```

### Step 2.2 — Install Docker and Docker Compose on Ubuntu 22.04

```bash
# VPS: Update and install prerequisites
sudo apt-get update
sudo apt-get install -y ca-certificates curl

# VPS: Add Docker’s official GPG key and repository
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# VPS: Install Docker Engine and Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# VPS: Verify
docker --version
docker compose version
```

### Step 2.3 — Put your code on the VPS (clone repo)

```bash
# VPS: Go to a folder where you keep projects (e.g. home)
cd ~

# VPS: Clone your repo (replace with your actual Git URL)
git clone https://github.com/YOUR_USERNAME/web-ranking-reports.git
cd web-ranking-reports
```

If you haven’t pushed your repo to GitHub yet:

- **LOCAL:** From your project folder: `git init`, `git add .`, `git commit -m "Initial commit"`, `git remote add origin YOUR_REPO_URL`, `git push -u origin main`
- Then on the **VPS** run the `git clone` and `cd` above with that repo URL.

### Step 2.4 — Create env file for deployment

```bash
# VPS: You should be in the repo root (web-ranking-reports)
cd ~/web-ranking-reports

# VPS: Copy the example env file
cp infra/.env.example infra/.env

# VPS: Edit if you need different domains (optional; default is webrankingreports.com and pb.webrankingreports.com)
# nano infra/.env
# Ensure this line is present (for production):
# NUXT_PUBLIC_POCKETBASE_URL=https://pb.webrankingreports.com
```

### Step 2.5 — Point DNS to your VPS

**LOCAL:** In your domain registrar (where you bought webrankingreports.com):

1. Create an **A** record: **webrankingreports.com** → your VPS IP.
2. Create an **A** record: **pb.webrankingreports.com** → your VPS IP.

Wait a few minutes (or up to an hour) for DNS to propagate.

### Step 2.6 — Start the stack (Caddy + Nuxt + PocketBase)

```bash
# VPS: From repo root
cd ~/web-ranking-reports

# VPS: Build and start all services (Caddy, Nuxt, PocketBase)
docker compose -f infra/docker-compose.yml up -d --build

# VPS: Check that containers are running
docker compose -f infra/docker-compose.yml ps
```

### Step 2.7 — Create PocketBase admin and collections on the VPS (first time only)

1. **LOCAL:** In your browser go to: **https://pb.webrankingreports.com/_/**
2. Create the **admin** account (same as Step 1.3).
3. Create the same three collections and API rules as in **Step 1.4** (**sites**, **integrations**, **reports**).

PocketBase is now **deployed** and served at **https://pb.webrankingreports.com**. Your Nuxt app at **https://webrankingreports.com** will use it automatically (via `NUXT_PUBLIC_POCKETBASE_URL` in `infra/.env`).

---

## Part 3 — Useful commands

### LOCAL

```bash
# Stop PocketBase: in the terminal where it’s running, press Ctrl+C.

# Start PocketBase again (from project root):
cd "/Users/doughigson/Desktop/VMA/WEB RANKING REPORTS"
./apps/pb/pocketbase serve --dir=apps/pb
```

### VPS

```bash
# View logs (from repo root on VPS)
docker compose -f infra/docker-compose.yml logs -f

# Stop the whole stack
docker compose -f infra/docker-compose.yml down

# Start the stack again (after code changes, rebuild web)
docker compose -f infra/docker-compose.yml up -d --build web
```

---

## Quick reference

| What                    | LOCAL                          | VPS (deployed)                        |
|-------------------------|---------------------------------|----------------------------------------|
| PocketBase URL          | http://127.0.0.1:8090          | https://pb.webrankingreports.com      |
| PocketBase Admin        | http://127.0.0.1:8090/_/       | https://pb.webrankingreports.com/_/   |
| Nuxt app                | http://localhost:3000          | https://webrankingreports.com          |
