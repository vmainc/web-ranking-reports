#!/usr/bin/env node
/**
 * Adds "partner" to crm_clients.status select field.
 * Run from apps/web: node scripts/add-crm-client-partner-status.mjs
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

async function auth() {
  const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).token
}

async function main() {
  const token = await auth()
  const listRes = await fetch(`${PB_URL}/api/collections?perPage=200`, { headers: { Authorization: token } })
  const raw = await listRes.json()
  const collections = Array.isArray(raw) ? raw : raw.items || []
  const collection = collections.find((c) => c.name === 'crm_clients')
  if (!collection) throw new Error('crm_clients collection not found')
  const schema = Array.isArray(collection.schema) ? collection.schema : []
  const statusField = schema.find((f) => f?.name === 'status')
  if (!statusField?.options?.values || !Array.isArray(statusField.options.values)) {
    throw new Error('crm_clients.status select field not found')
  }
  if (statusField.options.values.includes('partner')) {
    console.log('status already includes partner')
    return
  }
  statusField.options.values.push('partner')
  const patchRes = await fetch(`${PB_URL}/api/collections/${collection.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({ schema }),
  })
  if (!patchRes.ok) throw new Error(await patchRes.text())
  console.log('Added partner to crm_clients.status')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
