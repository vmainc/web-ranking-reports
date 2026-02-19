#!/usr/bin/env node
/**
 * Add "bing_webmaster" to the integrations collection's provider select options.
 * Run from apps/web with PocketBase up and admin credentials in .env:
 *
 *   node scripts/add-bing-webmaster-provider.mjs
 *
 * Uses POCKETBASE_URL (or http://127.0.0.1:8090), POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD.
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

const NEW_VALUE = 'bing_webmaster'

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD (or PB_ADMIN_*) in apps/web/.env')
  process.exit(1)
}

async function main() {
  const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) {
    const t = await res.text()
    console.error('Admin login failed:', t)
    process.exit(1)
  }
  const { token } = await res.json()

  const listRes = await fetch(`${PB_URL}/api/collections?perPage=200`, {
    headers: { Authorization: token },
  })
  if (!listRes.ok) {
    console.error('Failed to list collections:', await listRes.text())
    process.exit(1)
  }
  const { items } = await listRes.json()
  const integrations = items.find((c) => c.name === 'integrations')
  if (!integrations) {
    console.error('integrations collection not found')
    process.exit(1)
  }

  const providerField = integrations.schema?.find((f) => f.name === 'provider')
  if (!providerField || providerField.type !== 'select') {
    console.error('provider select field not found')
    process.exit(1)
  }

  const values = providerField.options?.values || []
  if (values.includes(NEW_VALUE)) {
    console.log(`"${NEW_VALUE}" is already in integrations.provider. Nothing to do.`)
    return
  }

  const newValues = [...values, NEW_VALUE]
  const newSchema = integrations.schema.map((f) =>
    f.name === 'provider'
      ? { ...f, options: { ...f.options, values: newValues } }
      : f
  )

  const updateBody = {
    name: integrations.name,
    type: integrations.type,
    schema: newSchema,
    indexes: integrations.indexes || [],
    listRule: integrations.listRule ?? '',
    viewRule: integrations.viewRule ?? '',
    createRule: integrations.createRule ?? '',
    updateRule: integrations.updateRule ?? '',
    deleteRule: integrations.deleteRule ?? '',
  }

  const patchRes = await fetch(`${PB_URL}/api/collections/${integrations.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(updateBody),
  })
  if (!patchRes.ok) {
    const t = await patchRes.text()
    console.error('Failed to update collection:', t)
    process.exit(1)
  }
  console.log(`Added "${NEW_VALUE}" to integrations.provider. Done.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
