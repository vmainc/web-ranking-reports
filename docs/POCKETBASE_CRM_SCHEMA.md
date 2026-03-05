# PocketBase CRM schema changes (MVP)

Use these steps in **PocketBase Admin** (_/_) or run `node scripts/update-crm-schema.mjs` from `apps/web` (with PB credentials in env).

---

## A) Update collection `crm_clients`

1. Go to **Collections** → **crm_clients** → **Fields**.
2. Add these fields (keep all existing: user, name, email, phone, company, status, notes):

| Name | Type | Required | Options |
|------|------|----------|---------|
| pipeline_stage | select | Yes | values: `new`, `contacted`, `qualified`, `proposal`, `won`, `lost` (maxSelect: 1) |
| source | text | No | max: 255 |
| next_step | text | No | max: 2000 |
| last_activity_at | date | No | — |
| tags_json | json | No | — |
| site | relation | No | collection: **sites**, maxSelect: 1 (link client to one site for onboarding/integrations) |

3. Set **default value** for `pipeline_stage` to `new` (in field options if available).
4. **API rules**: keep existing (list/view/create/update/delete: `user = @request.auth.id`).

---

## B) Create new collection `crm_tasks`

1. **Collections** → **New collection**.
2. **Name**: `crm_tasks`.
3. **Type**: Base.
4. **API rules**:
   - List: `user = @request.auth.id`
   - View: `user = @request.auth.id`
   - Create: `@request.auth.id != ""`
   - Update: `user = @request.auth.id`
   - Delete: `user = @request.auth.id`
5. **Fields**:

| Name | Type | Required | Options |
|------|------|----------|---------|
| user | relation | Yes | collection: users, maxSelect: 1, **cascadeDelete: true** |
| client | relation | Yes | collection: crm_clients, maxSelect: 1, **cascadeDelete: true** |
| title | text | Yes | min: 1, max: 255 |
| due_at | date | Yes | — |
| priority | select | Yes | values: `low`, `med`, `high` (maxSelect: 1) |
| status | select | Yes | values: `open`, `done` (maxSelect: 1) |
| notes | text | No | max: 5000 |

6. Save.

---

## C) Update collection `crm_sales`

1. **Collections** → **crm_sales** → **Fields**.
2. Add:

| Name | Type | Required | Options |
|------|------|----------|---------|
| probability | number | No | min: 0, max: 100 |
| expected_close_at | date | No | — |

3. Save.

---

## Summary

- **crm_clients**: add `pipeline_stage`, `source`, `next_step`, `last_activity_at`, `tags_json`, `site` (optional relation to sites).
- **crm_tasks**: new collection (user, client, title, due_at, priority, status, notes).
- **crm_sales**: add `probability`, `expected_close_at`.
