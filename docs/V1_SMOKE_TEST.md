# V1 smoke test

Run after local `npm run dev:stack` or post-deploy.

## Automated (no credentials)

```bash
bash scripts/check-release-clean.sh
bash scripts/smoke-local.sh
npm --prefix apps/web audit
npm --prefix apps/web run build
```

Optional with stack running:

```bash
bash scripts/smoke-local.sh http://127.0.0.1:3000 http://127.0.0.1:8090
```

## Manual — auth & account

- [ ] Register new user (email/password)
- [ ] Log out and log in
- [ ] Password reset email (PocketBase mailer + SMTP env)
- [ ] Team invite: send invite, set password via link, member can log in
- [ ] Client portal invite: client sees assigned sites read-only

## Manual — site & integrations

- [ ] Add a site (workspace)
- [ ] Connect Google (OAuth) — Analytics, optional Ads/GSC/GBP
- [ ] Run Lighthouse / PageSpeed for site domain
- [ ] Rank tracking: add keyword, fetch positions
- [ ] WooCommerce config (if enabled)

## Manual — reports

- [ ] Report builder: add modules, set reporting period, save
- [ ] Preview report in browser
- [ ] Download PDF from preview
- [ ] Scheduled report (Growth+): create schedule, verify email/PDF on next run (or trigger cron in staging)

## Manual — billing

- [ ] Stripe Checkout (test mode) — Starter/Growth upgrade
- [ ] Customer portal — manage subscription
- [ ] Free plan limits show upgrade messaging (reports, contacts, etc.)

## Manual — admin & security

- [ ] Non-admin cannot open `/admin` integrations
- [ ] Admin can save Google OAuth / API keys in Admin UI
- [ ] Public lead form: submit with honeypot empty; spam honeypot silently succeeds
- [ ] With Turnstile env set: form requires widget token

## Post-deploy only

- [ ] HTTPS on apex and `pb.` subdomain
- [ ] Caddy security headers present (`curl -I https://yourdomain.com`)
- [ ] PocketBase migration `1780400000_launch_collection_rules_hardening` applied (check PB logs on restart)
- [ ] Stripe live webhook receives events
