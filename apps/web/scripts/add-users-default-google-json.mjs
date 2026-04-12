#!/usr/bin/env node
/**
 * Add `default_google_json` (type: json) to PocketBase `users` if missing.
 * Required for Account → Workspace Google Calendar (OAuth tokens + dashboard_calendars).
 *
 * Local (with Node):
 *   cd apps/web
 *   PB_URL=https://your-pb.example.com PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... node scripts/add-users-default-google-json.mjs
 *
 * Production VPS without Node (Docker only):
 *   export PB_URL=... PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=...
 *   bash apps/web/scripts/run-add-users-default-google-json-docker.sh
 *
 * Loads apps/web/.env and infra/.env when those files exist (optional if env is already set).
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

async function main() {
  const token = await auth()
  const listRes = await fetch(`${PB_URL}/api/collections?perPage=200`, { headers: { Authorization: token } })
  const raw = await listRes.json()
  const collections = Array.isArray(raw) ? raw : raw.items || []
  const usersCol = collections.find((c) => c.name === 'users')
  if (!usersCol) {
    console.error('users collection missing.')
    process.exit(1)
  }

  const schema = usersCol.schema || []
  if (schema.some((f) => f.name === 'default_google_json')) {
    console.log('users.default_google_json already exists — nothing to do.')
    return
  }

  const newFields = [
    ...schema,
    {
      name: 'default_google_json',
      type: 'json',
      required: false,
      options: {},
    },
  ]
  await patchCollection(token, usersCol.id, { schema: newFields })
  console.log('Added users.default_google_json (JSON). Reconnect Google under Account → Integrations if tokens failed before.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
