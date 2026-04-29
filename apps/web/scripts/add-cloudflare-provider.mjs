#!/usr/bin/env node
/**
 * Adds "cloudflare" option to integrations.provider select field.
 * Run: node scripts/add-cloudflare-provider.mjs
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
  const integrations = collections.find((c) => c.name === 'integrations')
  if (!integrations) throw new Error('integrations collection not found')
  const schema = Array.isArray(integrations.schema) ? integrations.schema : []
  const provider = schema.find((f) => f?.name === 'provider')
  if (!provider?.options?.values || !Array.isArray(provider.options.values)) {
    throw new Error('integrations.provider select field not found')
  }
  if (provider.options.values.includes('cloudflare')) {
    console.log('provider already includes cloudflare')
    return
  }
  provider.options.values.push('cloudflare')
  const patchRes = await fetch(`${PB_URL}/api/collections/${integrations.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({ schema }),
  })
  if (!patchRes.ok) throw new Error(await patchRes.text())
  console.log('Added cloudflare provider option.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

