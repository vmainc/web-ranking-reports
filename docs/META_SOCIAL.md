# Meta / Facebook social tracking

Facebook Pages are the first social integration in Web Ranking Reports. Instagram and Meta Ads are **not** implemented yet; the same tables and OAuth connection are designed to add them later.

```text
Agency / Workspace
    └── Meta Integration (provider = meta)
            ├── Facebook Page A → Site A
            ├── Facebook Page B → Site B
            └── later: Instagram / Ad accounts
```

Architecture:

```text
Meta Integration
    ↓
Social Asset Connection (site_social_connections)
    ↓
Metric Provider (public adapter or Meta Graph adapter)
    ↓
Normalized Metrics (WRR keys + aggregation metadata)
    ↓
Snapshot History (social_metric_snapshots)
    ↓
Reports (persisted data only)
```

Graph API version is centralized in `getMetaConfig()` / `META_GRAPH_API_VERSION` (default **v25.0**). Do not hardcode `/vXX.X/` in routes. Override with `META_GRAPH_API_VERSION` if Meta requires a newer pin.

**Why v25.0:** Page Insights unique media-view metrics (`page_total_media_view_unique`) shipped on Graph v25. Latest Graph may already be v26; v25.0 remains a supported version until **2028-07-29**. WRR pins v25.0 intentionally so Insights field names stay stable.

---

## Meta app setup

1. Create an app at [Meta for Developers](https://developers.facebook.com/apps/).
2. Add **Facebook Login for Business** (not a custom scrape, not browser automation).
3. App type should support Pages you manage (Business / Business-capable).
4. **Valid OAuth Redirect URIs** must match `META_OAUTH_REDIRECT_URI` exactly:
   - Local: `http://localhost:3000/api/agency/integrations/meta/callback`
   - Production: `https://webrankingreports.com/api/agency/integrations/meta/callback`
5. Request only these permissions (no Instagram, no Ads, no visitor-content):
   - `pages_show_list`
   - `pages_read_engagement`
   - `read_insights`
6. Optional: create a Facebook Login for Business configuration and set `META_LOGIN_CONFIG_ID`. When set, the OAuth dialog uses `config_id` instead of `scope`. The Login configuration in Meta’s dashboard **must request the same three permissions** — do not add `pages_read_user_content` there either.
7. **Development vs Live:** in development, only users/roles on the app can authorize. Live mode requires App Review for permissions used by customers. Approval has **not** occurred until Meta grants it.
8. **Public Page access:** arbitrary public Page lookup through Graph requires **Page Public Content Access** App Review. Until that (or another compliant provider) is configured, WRR still stores the Page URL and treats public metrics as unavailable. It does **not** scrape Facebook HTML.

### Environment

| Variable | Purpose |
|----------|---------|
| `META_APP_ID` | Meta app id |
| `META_APP_SECRET` | Meta app secret (server-only) |
| `META_OAUTH_REDIRECT_URI` | Must match the developer dashboard |
| `META_GRAPH_API_VERSION` | Optional; default `v25.0`. Single authoritative Graph version source. |
| `META_LOGIN_CONFIG_ID` | Optional Login for Business config id |
| `EMAIL_CREDENTIALS_ENCRYPTION_KEY` | Encrypts Meta user + Page tokens at rest (same AES-256-GCM helper as Gmail) |
| `STATE_SIGNING_SECRET` | Signs OAuth `state` |
| `SOCIAL_FACEBOOK_CRON_ENABLED` | `true` to run daily due-only Insights sync |

### Production PocketBase schema

Production PocketBase starts with `--migrationsDir=/pb_data/pb_migrations_empty`, so `1780800000_social_meta_collections.js` is **not** applied by restarting `pb`. After a PocketBase backup, create the collections with the existing admin-API pattern:

```bash
# VPS, after backup
./infra/run-social-meta-collections.sh
```

Local / non-production:

```bash
cd apps/web
node scripts/add-social-meta-collections.mjs
```

JS migrations also exist (used when a PocketBase instance actually runs that migrations dir):

- `apps/pb/pb_migrations/1780800000_social_meta_collections.js`
- `apps/pb_migrations/1780800000_social_meta_collections.js`

### Production backup (before schema)

Authoritative data is the Docker volume `pb_data` (typically `infra_pb_data`) at `/pb_data` inside the `pb` container. Use PocketBase Admin → Backups, or the same tar approach as `scripts/sync-pb-from-vps.sh`:

```bash
# VPS
cd ~/web-ranking-reports
mkdir -p /root/pb-backups
docker compose --project-directory ~/web-ranking-reports/infra --env-file ~/web-ranking-reports/infra/.env -f ~/web-ranking-reports/infra/docker-compose.yml \
  exec -T pb tar czf - -C /pb_data . > /root/pb-backups/pb_data-$(date +%Y%m%d%H%M%S).tar.gz
ls -lh /root/pb-backups/pb_data-*.tar.gz | tail -1
```

Confirm the archive is non-zero size before running `run-social-meta-collections.sh`.

---

## Permissions (least privilege)

WRR does **not** request `pages_read_user_content`. That permission is for visitor posts, comments, and ratings. Implemented endpoints only read Page metadata, Page-owned posts (id/created_time for a published count), Page engagement Insights, and managed Page list.

| Permission | Endpoint / function | Why WRR needs it | App Review |
|------------|---------------------|------------------|------------|
| `pages_show_list` | `GET /me/accounts` via `listMetaManagedPages` | List Pages the connected user manages, including Page access tokens and stable Page ids | Yes, for Live / non-role users |
| `pages_read_engagement` | `GET /{page-id}` (`followers_count`) and `GET /{page-id}/posts` via `fetchPageMetrics` / `fetchRecentPosts` | Page follower count and Page-owned post count | Yes, for Live / non-role users |
| `read_insights` | `GET /{page-id}/insights` via `fetchPageMetrics` | Unique 28-day media viewers and post engagements | Yes, for Live / non-role users |

`pages_read_engagement` is also required alongside `read_insights` for Page Insights.

---

## Authentication and token lifecycle

- **Workspace/agency level**, not per site.
- Facebook Login dialog → authorization `code` → short-lived user token (`exchangeMetaCodeForToken`) → long-lived user token (`fb_exchange_token` via `exchangeMetaLongLivedToken`).
- Long-lived **user** tokens typically last about **60 days**. WRR stores `token_expires_at` from Meta’s `expires_in` (falls back to 60 days if omitted). This is **not** a guarantee that every token expires on the same clock; reconnect when Graph returns auth errors (code 190 / 102) or when status is `reconnect_required`.
- User token is encrypted on `agency_integrations.encrypted_access_token`.
- When a Page is mapped, the **Page access token** from `GET /me/accounts` is encrypted on `site_social_connections.encrypted_page_token`. Page tokens obtained this way typically remain valid while the user token / Page role remains valid; they are **not** assumed to share the user token’s 60-day expiry.
- Reconnect (successful OAuth callback) **replaces** the encrypted user token and `token_expires_at`, then **refreshes Page tokens on existing mappings by Meta Page id**. It does not create duplicate Page rows, does not delete snapshots, and updates `display_name` if the Page was renamed.
- If a previously mapped Page is no longer in `/me/accounts`, that connection is marked `reconnect_required` without deleting history.
- Disconnect revokes `DELETE /me/permissions` (best effort), clears encrypted tokens, marks authenticated connections `reconnect_required`, and **keeps snapshots**.
- Tokens are never returned to the browser or written to logs.
- Statuses: `connected`, `expired`, `reconnect_required`, `error`, `disconnected`.

---

## Public vs authenticated

| | Public tracking | Authenticated Insights |
|---|---|---|
| How | Site → Social → Facebook Page URL | Agency → Integrations → Connect Meta → map Page to site |
| `access_type` | `public` | `authenticated` |
| Identity | Canonical URL / username (`fb_url:…`); not display name | Meta Page id |
| Metrics | Architecture ready; default provider is unavailable (no invented data) | Followers (point-in-time), 28-day unique media viewers, 28-day engagements, posts published |
| Upgrade | Mapping a matching Meta Page **updates the same connection row** | Preserves historical public snapshots. Ambiguous URL/username match requires explicit remap (409). |

Page discovery paginates `GET /me/accounts` (`paging.next`) and stores Meta Page **id**. Renames update `display_name` on the same connection.

---

## Metrics (v1)

Aggregation is defined on the normalized metric registry (`FACEBOOK_PAGE_METRICS` / `FACEBOOK_DERIVED_METRICS`). Report code must not invent Meta-specific summing rules.

| WRR key | Source | Aggregation | Stored period | Report behavior |
|---------|--------|-------------|---------------|-----------------|
| `facebook.page.followers` | Graph `followers_count` (fallback `fan_count`) | `point_in_time` | Observation date (`period_start` = `period_end` = snapshot day) | Current as of the observation on or before the report end date. Aug 15 and Aug 16 snapshots coexist. |
| `facebook.page.follows` | Insights `page_follows` (`period=day`) | `point_in_time` | Observation day. Meta’s metric is lifetime net follows, **not** daily new follows. Latest day only — **not summed**. | Not shown on the v1 report card (followers_count is). Stored for history. |
| `facebook.page.reach` | Insights `page_total_media_view_unique` (`period=days_28`) | `non_additive` | Meta’s 28-day unique window from the datapoint `end_time` (`period_type=days_28`) | Shown only when that stored window matches the report range (±2 days). **Never** summed across days. Label: unique media viewers for that window — not “reach for an unmatched 7- or 90-day range.” |
| `facebook.page.engagement` | Insights `page_post_engagements` (`period=days_28`) | `sum` (additive counts; stored as Meta’s 28-day total) | Same 28-day window as returned by Meta. Rolling `days_28` series are **not** summed together. | Shown only when the stored window matches the report range. Caption: during stored period. |
| `facebook.page.posts_published` | Graph `/{page-id}/posts` count (paginated) in the collection window | `sum` | Collection range (`period_type=range`) | Shown only when that range matches the report range. |
| `facebook.page.follower_growth` | Derived: ending − beginning `facebook.page.followers` snapshots | `derived` | **Not persisted** | Difference between the follower observation on or before range start and on or before range end. Null if either point is missing. |

Unavailable metrics are `null` / `available: false`, never coerced to `0`. Approximate values keep `isExact: false` and render with a `~` prefix.

Snapshot dedupe: `connection \| metric_key \| period_type \| period_start \| period_end`. Point-in-time days differ → history. The same Meta 28-day window upserts.

---

## Scheduler

- Cadence: daily (`0 6 * * *` America/Chicago by default).
- Due rule: authenticated Facebook Page connections whose `last_synced_at` is empty or older than 20 hours (due detection only).
- **Concurrency lock:** `runDueFacebookSync` takes an in-process mutex plus an `app_settings` row `social_facebook_sync_lock`. Only one Facebook social **batch** runs at a time. Stale locks (older than 45 minutes) are stolen. The lock is always released in `finally`. One failed connection does not abort the batch.
- Docker Compose ships a **single** `web` replica / Nitro process. The in-process lock covers overlapping cron + accidental double invocation in that process. The `app_settings` lock covers a second process if one is added later **without** introducing Redis.
- Failed auth marks the agency integration `reconnect_required`. Historical snapshots remain.
- Reports never call Meta live.

---

## Meta App Review

Approval has **not** been granted by this document. Submit only the permissions WRR actually uses.

### Permissions / features to submit

- `pages_show_list`
- `pages_read_engagement`
- `read_insights`

Do **not** submit `pages_read_user_content`, Instagram, Ads, or publishing.

Page Public Content Access is **not** required for the authenticated Insights path. It is only relevant if a future public-Page provider uses Graph for Pages the user does not manage.

### What can be tested in Development mode (no review yet)

App roles (admins/developers/testers) can:

1. Connect Meta and authorize the three permissions.
2. List managed Pages (including more than 100 if pagination applies).
3. Map a Page they manage to a WRR site.
4. Run/read Facebook reporting from persisted snapshots.

Customers who are not app roles cannot complete Login until Live mode + review.

### Reviewer walkthrough (record later as one video)

Use a reviewer account that manages at least one Facebook Page.

1. Sign in to Web Ranking Reports as the workspace owner.
2. Open **Agency → Integrations**.
3. In the **Meta** card, click **Connect Meta** (or **Reconnect Meta**).
4. Complete Facebook Login and grant Page list, Page content/engagement, and Insights.
5. Land back on Agency → Integrations with Meta connected and a count of available Pages.
6. Click **Manage Pages**. Map a Page to a site (or open the site → **Social** and complete mapping).
7. Open **Reports** (or the site report builder), add the **Facebook** module, set the date range to **Last 28 days**.
8. Confirm the card shows:
   - **Followers** as a current point-in-time count (with as-of date)
   - **Follower growth** as the difference across the selected period (or hidden if a baseline snapshot does not exist yet)
   - **Reach** as unique media viewers for the stored 28-day window (not a guessed 7-day unique)
   - **Engagement** and **Posts** for that same stored period
   - `—` when a metric is unavailable, never `0`

### Permission → UI → code map

| Permission | Reviewer clicks | What appears | Code |
|------------|-----------------|--------------|------|
| `pages_show_list` | Connect Meta → authorize → Manage Pages | List of Pages the user manages | `listMetaManagedPages` / `GET /me/accounts` |
| `pages_read_engagement` | Map Page → open Facebook report module | Followers and posts published | `fetchPageMetrics` (`GET /{page-id}`), `fetchRecentPosts` (`GET /{page-id}/posts`) |
| `read_insights` | Map Page → Facebook report module (Last 28 days) | Unique media viewers and post engagements | `fetchPageMetrics` (`GET /{page-id}/insights`) |

### Access Verification / Tech Provider (customer-wide, later)

App Review alone is **not** enough for other agencies/customers (people without an app role) to grant `pages_show_list`, `pages_read_engagement`, or `read_insights`.

Meta’s [Access Verification](https://developers.facebook.com/docs/development/release/access-verification/) list includes all three WRR permissions. For those endpoints, if the user has **no role on the app**, Graph checks that the app’s claimant business is verified as a **Tech Provider**. Otherwise calls fail (often Graph error 100).

Before a customer-wide launch (not this Development-mode test):

1. Keep the Meta app in **Development** until the controlled OAuth/Insights test succeeds.
2. Complete **Business Verification** for the Business Manager that claims the app.
3. Complete **Access Verification / Tech Provider** (App Dashboard → Settings → Basic → Verifications).
4. Submit **App Review** for Advanced Access on the three permissions (screencast of Agency → Integrations → Connect Meta → map Page → Facebook report).
5. Only then switch the app **Live**.

This controlled production test uses **Development mode** and an **app-role** account. It does not enable external customer access.

---

## Operational troubleshooting

| Symptom | Likely cause | What to do |
|---------|--------------|------------|
| OAuth returns immediately to `meta=error` | Redirect URI mismatch, app id/secret, or Login config | Match `META_OAUTH_REDIRECT_URI` to the dashboard; confirm app is in a mode that allows your user |
| `meta=denied` | User cancelled Login | Connect again and grant Page permissions |
| Reconnect required | User token expired (~60 days) or permissions revoked | Agency → Integrations → Reconnect Meta (refreshes Page tokens for still-accessible Pages) |
| Permission missing | App Review not granted, or user skipped a Page permission | Reconnect and grant Pages / Insights |
| Page no longer accessible | User lost Page role | Remap or disconnect that Page |
| Public metrics unavailable | No Page Public Content Access / no public provider | Expected in v1; connect Meta for Pages you manage |
| Reach blank on Last 7 / 90 days | Unique reach is Meta’s 28-day unique, not summed dailies | Use Last 28 days, or treat as unavailable |
| Rate limited | Graph code 4/17/32 | Next daily sync retries; historical reports still work |
| Sync skipped (`skipped: lock`) | Another Facebook batch is running | Wait; stale locks recover after 45 minutes |
| Sync failed | Logged as `social.facebook.sync.failed` with connection/site/page ids (no tokens) | Inspect `last_error` on the connection |

---

## Future hooks (not built)

Same OAuth + `agency_integrations` (`provider=meta`):

- Instagram: `platform=instagram`, `asset_type=instagram_business_account` (add IG scopes later).
- Ads: `platform=facebook`, `asset_type=ad_account` (add ads scopes later).

Do not create a second encryption system, OAuth state signer, snapshot table, or scheduler framework for those.
