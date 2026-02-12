# PocketBase Collections + Access Rules

Create these in **PocketBase Admin** (http://localhost:8090/_/) after first run. Settings → Import collections, or create manually as below.

---

## Collection: `users` (built-in)

PocketBase provides this. Ensure "Auth" is enabled. No changes needed for email/password auth.

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
