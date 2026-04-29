#!/usr/bin/env node
/**
 * Create PocketBase collections for Cloudflare integration MVP:
 * - cloudflare_integrations
 * - cloudflare_data
 *
 * Run: node scripts/add-cloudflare-collections.mjs
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
  return (await res.json()).token
}

async function listCollections(token) {
  const res = await fetch(`${PB_URL}/api/collections?perPage=200`, { headers: { Authorization: token } })
  const raw = await res.json()
  return Array.isArray(raw) ? raw : raw.items || []
}

async function createCollection(token, body) {
  const res = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`)
}

async function main() {
  const token = await auth()
  const cols = await listCollections(token)
  const usersCol = cols.find((c) => c.name === 'users')
  if (!usersCol) throw new Error('users collection required')

  if (!cols.find((c) => c.name === 'cloudflare_integrations')) {
    await createCollection(token, {
      name: 'cloudflare_integrations',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      schema: [
        { name: 'user', type: 'relation', required: true, options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: true } },
        { name: 'api_token', type: 'text', required: true, options: { min: 20, max: 5000 } },
        { name: 'account_id', type: 'text', required: false, options: { max: 120 } },
        { name: 'connected', type: 'bool', required: false, options: {} },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_cloudflare_integrations_user ON cloudflare_integrations (user)'],
    })
    console.log('Created collection: cloudflare_integrations')
  } else {
    console.log('cloudflare_integrations already exists.')
  }

  if (!cols.find((c) => c.name === 'cloudflare_data')) {
    await createCollection(token, {
      name: 'cloudflare_data',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      schema: [
        { name: 'user', type: 'relation', required: true, options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: true } },
        { name: 'zone_id', type: 'text', required: true, options: { max: 120 } },
        { name: 'domain', type: 'text', required: true, options: { max: 255 } },
        { name: 'requests', type: 'number', required: false, options: {} },
        { name: 'bandwidth', type: 'number', required: false, options: {} },
        { name: 'threats', type: 'number', required: false, options: {} },
        { name: 'cached_percent', type: 'number', required: false, options: {} },
        { name: 'date', type: 'date', required: true },
      ],
      indexes: [
        'CREATE INDEX idx_cloudflare_data_user ON cloudflare_data (user)',
        'CREATE INDEX idx_cloudflare_data_zone_date ON cloudflare_data (zone_id, date)',
      ],
    })
    console.log('Created collection: cloudflare_data')
  } else {
    console.log('cloudflare_data already exists.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

