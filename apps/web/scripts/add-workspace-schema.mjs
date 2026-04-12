#!/usr/bin/env node
/**
 * Add workspace fields to `users` (including `default_google_json` for Account / dashboard Google Calendar),
 * create `client_site_access` for client ↔ site assignments.
 *
 * Local:   cd apps/web && node scripts/add-workspace-schema.mjs
 * Live PB: use the **public** PocketBase URL (HTTPS), not docker-internal `http://pb:8090`, unless you run inside the compose network.
 *
 *   cd /path/to/repo/apps/web
 *   PB_URL=https://pb.yourdomain.com PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... node scripts/add-workspace-schema.mjs
 *
 * Loads env from `apps/web/.env` then `infra/.env` (repo root) for missing keys.
 * Env: PB_URL (or POCKETBASE_URL), PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD
 */

import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

function loadEnvFile(envPath) {
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
loadEnvFile(join(scriptDir, '..', '.env'))
loadEnvFile(join(scriptDir, '..', '..', '..', 'infra', '.env'))

const PB_URL = (process.env.POCKETBASE_URL || process.env.PB_URL || 'http://127.0.0.1:8090').replace(/\/+$/, '')
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || process.env.PB_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || process.env.PB_ADMIN_PASSWORD

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD.')
  process.exit(1)
}

async function auth() {
  const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.token
}

async function patchCollection(token, id, body) {
  const res = await fetch(`${PB_URL}/api/collections/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function createCollection(token, body) {
  const res = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function relationId(raw) {
  if (raw == null || raw === '') return ''
  if (typeof raw === 'string') return raw
  if (typeof raw === 'object' && typeof raw.id === 'string') return raw.id
  return ''
}

async function patchUserRecord(token, recordId, body) {
  const res = await fetch(`${PB_URL}/api/collections/users/records/${recordId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
}

/** Users invited before `account_type` existed may have agency_owner set but empty account_type — invite-set-password rejects them. */
async function backfillAccountTypes(token) {
  const clientIds = new Set()
  try {
    let page = 1
    for (;;) {
      const res = await fetch(`${PB_URL}/api/collections/client_site_access/records?page=${page}&perPage=500`, {
        headers: { Authorization: token },
      })
      if (!res.ok) break
      const data = await res.json()
      const items = data.items || []
      for (const row of items) {
        const cid = relationId(row.client)
        if (cid) clientIds.add(cid)
      }
      if (items.length < 500) break
      page += 1
    }
  } catch {
    // collection missing or empty
  }

  let page = 1
  let patched = 0
  for (;;) {
    const res = await fetch(`${PB_URL}/api/collections/users/records?page=${page}&perPage=500`, {
      headers: { Authorization: token },
    })
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    const items = data.items || []
    for (const u of items) {
      const ao = relationId(u.agency_owner)
      if (!ao) continue
      const at = typeof u.account_type === 'string' ? u.account_type.trim().toLowerCase() : ''
      if (at === 'member' || at === 'client' || at === 'agency_member') continue
      const next = clientIds.has(u.id) ? 'client' : 'member'
      await patchUserRecord(token, u.id, { account_type: next })
      patched += 1
      const em = typeof u.email === 'string' ? u.email : u.id
      console.log(`Backfilled account_type=${next} for ${em}`)
    }
    if (items.length < 500) break
    page += 1
  }
  if (patched === 0) {
    console.log('No users needed account_type backfill.')
  } else {
    console.log(`Backfill complete (${patched} user(s)).`)
  }
}

async function main() {
  const token = await auth()
  const listRes = await fetch(`${PB_URL}/api/collections?perPage=200`, { headers: { Authorization: token } })
  const raw = await listRes.json()
  const collections = Array.isArray(raw) ? raw : raw.items || []
  const usersCol = collections.find((c) => c.name === 'users')
  const sitesCol = collections.find((c) => c.name === 'sites')
  if (!usersCol || !sitesCol) {
    console.error('users or sites collection missing.')
    process.exit(1)
  }

  const schema = usersCol.schema || []
  const hasAgencyOwner = schema.some((f) => f.name === 'agency_owner')
  const hasAccountType = schema.some((f) => f.name === 'account_type')
  const hasInviteSentAt = schema.some((f) => f.name === 'invite_email_sent_at')
  const hasDefaultGoogleJson = schema.some((f) => f.name === 'default_google_json')

  const newFields = [...schema]
  let usersSchemaUpdated = false
  if (!hasInviteSentAt) {
    newFields.push({ name: 'invite_email_sent_at', type: 'date', required: false })
    usersSchemaUpdated = true
  }
  if (!hasAgencyOwner) {
    newFields.push({
      name: 'agency_owner',
      type: 'relation',
      required: false,
      options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: false, displayFields: ['email', 'name'] },
    })
    usersSchemaUpdated = true
  }
  if (!hasAccountType) {
    newFields.push({
      name: 'account_type',
      type: 'select',
      required: false,
      options: { maxSelect: 1, values: ['member', 'client'] },
    })
    usersSchemaUpdated = true
  }
  if (!hasDefaultGoogleJson) {
    newFields.push({
      name: 'default_google_json',
      type: 'json',
      required: false,
      options: {},
    })
    usersSchemaUpdated = true
  }
  if (usersSchemaUpdated) {
    await patchCollection(token, usersCol.id, { schema: newFields })
    console.log(
      'Updated users collection:',
      [
        !hasInviteSentAt && 'invite_email_sent_at',
        !hasAgencyOwner && 'agency_owner',
        !hasAccountType && 'account_type',
        !hasDefaultGoogleJson && 'default_google_json',
      ]
        .filter(Boolean)
        .join(', '),
    )
  } else {
    console.log('users schema already has workspace, invite_email_sent_at, and default_google_json.')
  }

  const hasClientAccess = collections.some((c) => c.name === 'client_site_access')
  if (!hasClientAccess) {
    await createCollection(token, {
      name: 'client_site_access',
      type: 'base',
      listRule:
        '@request.auth.id != "" && (client = @request.auth.id || owner = @request.auth.id || site.user = @request.auth.id)',
      viewRule:
        '@request.auth.id != "" && (client = @request.auth.id || owner = @request.auth.id || site.user = @request.auth.id)',
      createRule: '@request.auth.id != "" && owner = @request.auth.id',
      updateRule: 'owner = @request.auth.id',
      deleteRule: 'owner = @request.auth.id',
      schema: [
        {
          name: 'owner',
          type: 'relation',
          required: true,
          options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: false },
        },
        {
          name: 'client',
          type: 'relation',
          required: true,
          options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: true },
        },
        {
          name: 'site',
          type: 'relation',
          required: true,
          options: { collectionId: sitesCol.id, maxSelect: 1, cascadeDelete: true },
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_client_site_access_unique ON client_site_access (client, site)',
      ],
    })
    console.log('Created collection: client_site_access')
  } else {
    console.log('client_site_access already exists.')
  }

  if (process.env.SKIP_WORKSPACE_BACKFILL === '1' || process.env.SKIP_WORKSPACE_BACKFILL === 'true') {
    console.log('SKIP_WORKSPACE_BACKFILL set — skipping account_type backfill.')
  } else {
    await backfillAccountTypes(token)
  }

  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
