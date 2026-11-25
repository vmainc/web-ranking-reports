#!/usr/bin/env node
/**
 * Add DataForSEO snapshot JSON fields on PocketBase `sites`:
 *   - backlinks_snapshot
 *   - ai_visibility_snapshot
 *
 * Local (with Node):
 *   cd apps/web
 *   PB_URL=https://pb.example.com PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... node scripts/add-sites-dataforseo-snapshot-fields.mjs
 *
 * Production VPS without Node (Docker only):
 *   bash apps/web/scripts/run-add-sites-dataforseo-snapshot-fields-docker.sh
 *
 * Loads apps/web/.env and infra/.env when those files exist (optional if env is already set).
 */

import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const SNAPSHOT_FIELDS = [
  { name: 'backlinks_snapshot', type: 'json', required: false, options: { maxSize: 0 } },
  { name: 'ai_visibility_snapshot', type: 'json', required: false, options: { maxSize: 0 } },
]

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
  console.error('Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD (or POCKETBASE_* equivalents).')
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

function normalizeFieldForPatch(field) {
  if (!field || typeof field !== 'object') return field
  const out = { ...field }
  const opts = out.options && typeof out.options === 'object' ? { ...out.options } : {}
  if ('maxSize' in opts && (opts.maxSize == null || opts.maxSize === '')) opts.maxSize = 0
  if (out.type === 'json') {
    if (opts.maxSize == null || opts.maxSize === '') opts.maxSize = 0
  }
  out.options = opts
  return out
}

async function main() {
  console.log(`PocketBase: ${PB_URL}`)
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
  const sitesCol = collections.find((c) => c.name === 'sites')
  if (!sitesCol) {
    console.error('No "sites" collection found.')
    process.exit(1)
  }

  const detailRes = await fetch(`${PB_URL}/api/collections/${sitesCol.id}`, { headers: { Authorization: token } })
  const detailText = await detailRes.text()
  if (!detailRes.ok) {
    throw new Error(`GET /api/collections/${sitesCol.id} HTTP ${detailRes.status}: ${detailText.slice(0, 500)}`)
  }
  const full = JSON.parse(detailText)
  const schema = full.schema ?? full.fields ?? []
  const schemaArray = Array.isArray(schema) ? schema.map(normalizeFieldForPatch) : []
  const added = []
  for (const field of SNAPSHOT_FIELDS) {
    if (!schemaArray.some((f) => f && f.name === field.name)) {
      schemaArray.push(field)
      added.push(field.name)
    }
  }
  if (!added.length) {
    console.log('Sites collection already has backlinks_snapshot and ai_visibility_snapshot. Nothing to do.')
    return
  }

  const patchRes = await fetch(`${PB_URL}/api/collections/${sitesCol.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({ schema: schemaArray }),
  })
  const patchText = await patchRes.text()
  if (!patchRes.ok) {
    throw new Error(`PATCH /api/collections/${sitesCol.id} HTTP ${patchRes.status}: ${patchText.slice(0, 800)}`)
  }
  console.log(`Added to sites: ${added.join(', ')}`)
}

main().catch((e) => {
  console.error('Error:', e.message || e)
  process.exit(1)
})
