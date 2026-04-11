#!/usr/bin/env node
/**
 * If `agency_plans` was created with `raw_claude`, add `raw_response` (same purpose; API uses raw_response).
 * Safe to run multiple times.
 */
import PocketBase from 'pocketbase'
import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

function loadEnv() {
  const dir = dirname(fileURLToPath(import.meta.url))
  for (const rel of ['../.env', '../../../infra/.env']) {
    const envPath = join(dir, rel)
    if (!existsSync(envPath)) continue
    const content = readFileSync(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    }
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

const pb = new PocketBase(PB_URL)

async function adminAuth() {
  const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('Admin login failed', data)
    process.exit(1)
  }
  pb.authStore.save(data.token, data.admin)
}

async function main() {
  await adminAuth()
  const collections = await pb.collections.getFullList()
  const col = collections.find((c) => c.name === 'agency_plans')
  if (!col) {
    console.log('No agency_plans collection.')
    return
  }
  const full = await pb.collections.getOne(col.id)
  const schema = full.schema ?? full.fields ?? []
  const schemaArray = Array.isArray(schema) ? [...schema] : []
  if (schemaArray.some((f) => f && f.name === 'raw_response')) {
    console.log('raw_response already exists on agency_plans.')
    return
  }
  schemaArray.push({
    name: 'raw_response',
    type: 'text',
    required: false,
    options: { min: 0, max: 120000 },
  })
  await pb.collections.update(col.id, { schema: schemaArray })
  console.log('Added raw_response to agency_plans. You may keep raw_claude for old rows or remove it in PocketBase UI.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
