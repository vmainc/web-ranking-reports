#!/usr/bin/env node
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

async function getCollection(token, name) {
  const res = await fetch(`${PB_URL}/api/collections/${name}`, { headers: { Authorization: token } })
  if (!res.ok) throw new Error(await res.text())
  return await res.json()
}

async function patchCollection(token, id, body) {
  const res = await fetch(`${PB_URL}/api/collections/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
}

async function main() {
  const token = await auth()
  const subscriptions = await getCollection(token, 'subscriptions')
  const schema = Array.isArray(subscriptions?.schema) ? subscriptions.schema : []
  const byName = new Set(schema.map((f) => String(f.name || '')))

  const additions = []
  if (!byName.has('trial_start')) additions.push({ name: 'trial_start', type: 'date', required: false })
  if (!byName.has('trial_end')) additions.push({ name: 'trial_end', type: 'date', required: false })
  if (!byName.has('is_trial')) additions.push({ name: 'is_trial', type: 'bool', required: false, options: {} })
  if (!byName.has('dismissed_trial_banner')) additions.push({ name: 'dismissed_trial_banner', type: 'bool', required: false, options: {} })

  if (!additions.length) {
    console.log('subscriptions already has trial fields')
    return
  }

  const nextSchema = [...schema, ...additions]
  await patchCollection(token, subscriptions.id, { schema: nextSchema })
  console.log(`Updated subscriptions schema with ${additions.length} field(s).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

