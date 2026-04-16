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
 *
 * Live / Docker: `infra/.env` often sets `PB_URL=http://pb:8090` for the web container. That URL
 * does not work from your laptop or from the VPS host shell. This script then uses
 * `NUXT_PUBLIC_POCKETBASE_URL` (public https://pb…) when `PB_URL`’s hostname is `pb`.
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

/** Admin API base URL: prefer public PB URL when env only has Docker-internal `http://pb:8090`. */
function pickPbBaseUrl() {
  const explicit = (process.env.POCKETBASE_URL || process.env.PB_URL || '').trim().replace(/\/+$/, '')
  const publicUrl = (process.env.NUXT_PUBLIC_POCKETBASE_URL || '').trim().replace(/\/+$/, '')
  if (explicit) {
    try {
      const u = new URL(explicit.startsWith('http') ? explicit : `https://${explicit}`)
      if (u.hostname.toLowerCase() === 'pb' && publicUrl) {
        console.warn('PB_URL is internal (http://pb…); using NUXT_PUBLIC_POCKETBASE_URL for Admin API from this host.')
        return publicUrl
      }
    } catch {
      /* use explicit */
    }
    return explicit
  }
  if (publicUrl) return publicUrl
  return 'http://127.0.0.1:8090'
}

const PB_URL = pickPbBaseUrl()
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
  const bodyText = await res.text()
  if (!res.ok) {
    throw new Error(`Admin auth failed HTTP ${res.status}: ${bodyText.slice(0, 500)}`)
  }
  let data
  try {
    data = JSON.parse(bodyText)
  } catch {
    throw new Error(`Admin auth: expected JSON, got: ${bodyText.slice(0, 200)}`)
  }
  const token = data.token
  if (!token) throw new Error('Admin auth: no token in response (wrong URL or not PocketBase admin API?)')
  return token
}

async function patchCollection(token, id, body) {
  const res = await fetch(`${PB_URL}/api/collections/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(body),
  })
  const bodyText = await res.text()
  if (!res.ok) {
    throw new Error(`PATCH /api/collections/${id} HTTP ${res.status}: ${bodyText.slice(0, 800)}`)
  }
  try {
    return JSON.parse(bodyText)
  } catch {
    return {}
  }
}

function normalizeFieldForPatch(field) {
  if (!field || typeof field !== 'object') return field
  const out = { ...field }
  const opts = out.options && typeof out.options === 'object' ? { ...out.options } : {}
  // PB may require numeric maxSize on schema PATCH for some field types.
  if ('maxSize' in opts && (opts.maxSize == null || opts.maxSize === '')) opts.maxSize = 0
  if (out.type === 'json') {
    if (opts.maxSize == null || opts.maxSize === '') opts.maxSize = 0
  }
  out.options = opts
  return out
}

async function main() {
  console.log(`PocketBase: ${PB_URL}`)
  if (PB_URL.includes('127.0.0.1')) {
    console.warn('Tip: for live PB, set NUXT_PUBLIC_POCKETBASE_URL or PB_URL (public https://…) in infra/.env.')
  }
  const token = await auth()
  const listRes = await fetch(`${PB_URL}/api/collections?perPage=200`, { headers: { Authorization: token } })
  const listText = await listRes.text()
  if (!listRes.ok) {
    throw new Error(`GET /api/collections HTTP ${listRes.status}: ${listText.slice(0, 500)}`)
  }
  let raw
  try {
    raw = JSON.parse(listText)
  } catch {
    throw new Error(`GET /api/collections: not JSON (${listText.slice(0, 200)})`)
  }
  const collections = Array.isArray(raw) ? raw : raw.items || []
  const usersCol = collections.find((c) => c.name === 'users')
  if (!usersCol) {
    console.error('No collection named "users". Collections:', collections.map((c) => c.name).join(', '))
    process.exit(1)
  }

  const schema = usersCol.schema || []
  if (schema.some((f) => f.name === 'default_google_json')) {
    console.log('users.default_google_json already exists — nothing to do.')
    return
  }

  const newFields = [
    ...schema.map(normalizeFieldForPatch),
    {
      name: 'default_google_json',
      type: 'json',
      required: false,
      options: { maxSize: 0 },
    },
  ]
  await patchCollection(token, usersCol.id, { schema: newFields })
  const verify = await fetch(`${PB_URL}/api/collections/${usersCol.id}`, { headers: { Authorization: token } })
  const verifyText = await verify.text()
  if (!verify.ok) {
    console.log('PATCH succeeded but verify GET failed:', verify.status, verifyText.slice(0, 300))
    return
  }
  let v
  try {
    v = JSON.parse(verifyText)
  } catch {
    console.log('Verify response not JSON:', verifyText.slice(0, 200))
    return
  }
  const names = (v.schema || []).map((f) => f.name).join(', ')
  console.log('Added users.default_google_json (JSON).')
  console.log('users schema fields now include:', names.includes('default_google_json') ? 'default_google_json ✓' : `MISSING — ${names}`)
  console.log('Reconnect Google under Account → Integrations → Workspace Google Calendar.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
