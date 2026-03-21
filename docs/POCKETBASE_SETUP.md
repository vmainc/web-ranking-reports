# PocketBase Collections + Access Rules

Create these in **PocketBase Admin** (http://localhost:8090/_/) after first run. Settings → Import collections, or create manually as below.

---

## Collection: `users` (built-in)

PocketBase provides this. Ensure "Auth" is enabled.

**Optional — user type in Admin → Users:**

Add fields so the app can label **Agency** vs **Client** (invited read-only) users:

| Field name       | Type    | Required | Options / Notes                                      |
|------------------|---------|----------|------------------------------------------------------|
| `account_type`   | Select  | no       | Values: `agency`, `client` (default empty → Agency)  |
| `is_client`      | Bool    | no       | Alternative: `true` marks the user as Client         |

You can also use a single **text** field (`user_type`, `role`, or `kind`) with values like `client`, `viewer`, or `agency` — the server maps these for the admin user table.

**Platform admins** are always determined by `ADMIN_EMAILS` / `admin@vma.agency`, not by these fields.

---

## Collection: `sites`

| Field name   | Type     | Required | Options / Notes                    |
|-------------|----------|----------|------------------------------------|
| `user`      | Relation | yes      | Single, collection: users          |
| `name`      | Text     | yes      | Min 1, max 255                     |
| `domain`    | Text     | yes      | Min 1, max 255                     |

**Access rules:**

- **List / View:** `@request.auth.id != "" && user = @request.auth.id`
- **Create:** `@request.auth.id != ""`
- **Update / Delete:** `user = @request.auth.id`

---

## Collection: `integrations`

| Field name    | Type     | Required | Options / Notes                    |
|---------------|----------|----------|------------------------------------|
| `site`        | Relation | yes      | Single, collection: sites         |
| `provider`    | Select   | yes      | Options: `google_analytics`, `google_search_console`, `lighthouse`, `google_business_profile`, `google_ads`, `woocommerce` |
| `status`      | Select   | yes      | Options: `disconnected`, `pending`, `connected`, `error` |
| `connected_at` | Date    | no       | Date (with time)                   |
| `config_json` | JSON     | no       | For future OAuth/config            |

**Access rules:**

- **List / View:** `@request.auth.id != "" && site.user = @request.auth.id`
- **Create:** `@request.auth.id != "" && site.user = @request.auth.id`
- **Update / Delete:** `site.user = @request.auth.id`

---

## Collection: `reports`

| Field name   | Type     | Required | Options / Notes                    |
|-------------|----------|----------|------------------------------------|
| `site`      | Relation | yes      | Single, collection: sites         |
| `type`      | Text     | yes      | e.g. "ranking", "traffic"          |
| `period_start` | Date   | yes      | Date                               |
| `period_end`   | Date   | yes      | Date                               |
| `payload_json` | JSON   | no       | Report data                        |

**Access rules:**

- **List / View:** `@request.auth.id != "" && site.user = @request.auth.id`
- **Create:** `@request.auth.id != "" && site.user = @request.auth.id`
- **Update / Delete:** `site.user = @request.auth.id`

---

## API rules summary

- All three custom collections require `@request.auth.id != ""` for any access.
- `sites`: user can only see/edit their own (`user = @request.auth.id`).
- `integrations` and `reports`: access only if the related `site` belongs to the auth user (`site.user = @request.auth.id`).

Create **sites** first (it references `users`), then **integrations** and **reports** (they reference `sites`).

---

## `app_settings` key: `transactional_email_templates`

The Admin → **Emails** page stores **app** (non–PocketBase-auth) templates under this key as JSON:

```json
{
  "client_invite": { "subject": "...", "body": "..." },
  "site_access_granted": { "subject": "...", "body": "..." }
}
```

The `create-collections.mjs` script seeds an empty row for this key. Defaults are merged on the server when a key is missing.

---

## Workspace: team members & clients (optional)

Agency owners can invite **team members** (full access to the same sites) and **clients** (read-only on selected sites) from **Account** in the app. Invites send transactional emails configured under **Admin → Emails** (`agency_member_invite`, `client_invite`, etc.).

**One-time schema** (adds `users.agency_owner`, `users.account_type`, and `client_site_access`):

```bash
cd apps/web && node scripts/add-workspace-schema.mjs
```

Requires `PB_URL`, `PB_ADMIN_EMAIL`, and `PB_ADMIN_PASSWORD`. After this, **SMTP** must be enabled in PocketBase so invite emails send.
