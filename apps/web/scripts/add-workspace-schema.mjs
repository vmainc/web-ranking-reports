#!/usr/bin/env node
/**
 * Add workspace fields to `users`, create `client_site_access` for client ↔ site assignments.
 * Run after PocketBase is up: node scripts/add-workspace-schema.mjs
 * Env: PB_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD
 */

import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

function loadEnv() {
  const dir = dirname(fileURLToPath(import.meta.url))
  const envPath = join(dir, '..', '.env')
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
}
loadEnv()

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

  if (!hasAgencyOwner || !hasAccountType) {
    const newFields = [...schema]
    if (!hasAgencyOwner) {
      newFields.push({
        name: 'agency_owner',
        type: 'relation',
        required: false,
        options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: false, displayFields: ['email', 'name'] },
      })
    }
    if (!hasAccountType) {
      newFields.push({
        name: 'account_type',
        type: 'select',
        required: false,
        options: { maxSelect: 1, values: ['member', 'client'] },
      })
    }
    await patchCollection(token, usersCol.id, { schema: newFields })
    console.log('Updated users collection (agency_owner, account_type).')
  } else {
    console.log('users schema already has workspace fields.')
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

  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
