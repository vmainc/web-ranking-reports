# DNS not updating — checklist and workaround

## Why DNS might “not change”

1. **Wrong place** — You must change DNS where the domain’s **nameservers** point (e.g. if the domain uses Cloudflare NS, edit in Cloudflare; if it uses the registrar’s NS, edit at the registrar).
2. **Caching** — Your browser, ISP, or local machine can show old results. Can take 15 minutes up to 48 hours.
3. **Wrong record type** — Use **A** records (not CNAME for the root domain on some providers).
4. **Typo** — Double-check the VPS IP and host names (`@` or `webrankingreports.com`, and `pb`).

## Where is DNS for webrankingreports.com?

- **Registrar** (where you bought the domain): e.g. Namecheap, GoDaddy, Google Domains, Cloudflare Registrar.
- **DNS host** (if different): Check the domain’s **nameservers** (e.g. `ns1.something.com`). Whoever’s nameservers are listed is where you add the A records.

## What to add

| Type | Name / Host | Value / Points to | TTL (optional) |
|------|-------------|-------------------|-----------------|
| A    | `@` or `webrankingreports.com` | Your VPS IP (e.g. `163.245.212.8`) | 300 or default |
| A    | `pb`        | Same VPS IP        | 300 or default  |

Save, then wait 5–30 minutes (or longer if your provider is slow).

## Check from your Mac (LOCAL)

```bash
dig webrankingreports.com +short
dig pb.webrankingreports.com +short
```

Both should return your VPS IP. If they don’t, DNS isn’t updated yet or the records are in the wrong place.

## Test the app by IP while DNS is broken

The stack can listen on the raw IP so you can open the app with `http://YOUR_VPS_IP` (no HTTPS). See **infra/Caddyfile** — the `:80` block serves the Nuxt app when you visit `http://163.245.212.8` (replace with your IP). After DNS works, you can remove that block and use the domains only.
