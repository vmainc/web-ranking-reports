# V1 launch checklist

## Pre-deploy

- [ ] `bash scripts/check-release-clean.sh`
- [ ] `npm --prefix apps/web audit` — zero high/critical
- [ ] `npm --prefix apps/web run build`
- [ ] `infra/.env` filled on VPS (see `infra/.env.example`)
- [ ] Rotate secrets if any may have leaked — see [LAUNCH_SECURITY.md](./LAUNCH_SECURITY.md)
- [ ] DNS A/AAAA for `@` and `www` → VPS; `pb` → VPS
- [ ] Stripe webhook URL points to `https://YOUR_DOMAIN/api/stripe/webhook`
- [ ] Review [V1_SMOKE_TEST.md](./V1_SMOKE_TEST.md)

## Deploy

- [ ] Pull latest `main` on VPS (or CI image tag)
- [ ] `./infra/deploy.sh` (or your pipeline)
- [ ] Confirm Caddy serves HTTPS (no `:80` IP-test block in production Caddyfile)
- [ ] Restart PocketBase; confirm migration `1780400000_launch_collection_rules_hardening` in logs
- [ ] Web container healthy: `curl -s https://YOUR_DOMAIN/api/health`

## Post-deploy

- [ ] Run manual smoke items in [V1_SMOKE_TEST.md](./V1_SMOKE_TEST.md)
- [ ] Send test team invite + test report PDF
- [ ] Stripe test/live checkout on production domain
- [ ] Review Caddy / Docker logs for 5xx errors
- [ ] PocketBase admin: verify collection API rules on `app_settings`, `integrations`

## Rollback

1. Re-deploy previous Docker image tag (`WEB_IMAGE_TAG` in `infra/.env`).
2. If PocketBase migration caused issues: restore `pb_data` volume from backup (migrations are forward-only).
3. Revert DNS only if necessary; keep SSL certs on Caddy volume.

## Secret rotation (incident or scheduled)

See [LAUNCH_SECURITY.md](./LAUNCH_SECURITY.md) — rotate PB admin, SMTP, `STATE_SIGNING_SECRET`, invite secret, Stripe, Google/API keys; redeploy web container.

## DNS / SSL

- Apex + `www` → Caddy → Nuxt
- `pb.` subdomain → Caddy → PocketBase
- Caddy obtains certs automatically when DNS propagates

## Monitoring / logs

- `docker compose -f infra/docker-compose.yml logs -f web pb caddy`
- Watch for: failed cron jobs, SMTP errors, Stripe webhook 4xx, Google token refresh failures
- Optional: uptime check on `/api/health`
