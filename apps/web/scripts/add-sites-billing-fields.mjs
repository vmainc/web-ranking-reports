#!/usr/bin/env node
/**
 * Add per-site Stripe / trial fields to PocketBase `sites`, and grandfather existing rows as active.
 *
 * Run:
 *   cd apps/web && node scripts/add-sites-billing-fields.mjs
 *
 * Env: PB_URL / POCKETBASE_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD (or POCKETBASE_*).
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
  const body = await res.text()
  let data = {}
  try {
    data = body ? JSON.parse(body) : {}
  } catch (_) {}
  if (!res.ok) {
    console.error('Admin login failed.', res.status, body)
    process.exit(1)
  }
  pb.authStore.save(data.token, data.admin)
}

function hasField(schemaArray, name) {
  return schemaArray.some((f) => f && f.name === name)
}

async function main() {
  await adminAuth()

  const collections = await pb.collections.getFullList()
  const sites = collections.find((c) => c.name === 'sites')
  if (!sites) {
    console.error('No "sites" collection found.')
    process.exit(1)
  }

  const full = await pb.collections.getOne(sites.id)
  const schema = full.schema ?? full.fields ?? []
  const schemaArray = Array.isArray(schema) ? [...schema] : []

  const toAdd = []
  if (!hasField(schemaArray, 'trial_ends_at')) {
    toAdd.push({
      name: 'trial_ends_at',
      type: 'date',
      required: false,
      options: {},
    })
  }
  if (!hasField(schemaArray, 'stripe_customer_id')) {
    toAdd.push({
      name: 'stripe_customer_id',
      type: 'text',
      required: false,
      options: { min: 0, max: 200 },
    })
  }
  if (!hasField(schemaArray, 'stripe_subscription_id')) {
    toAdd.push({
      name: 'stripe_subscription_id',
      type: 'text',
      required: false,
      options: { min: 0, max: 200 },
    })
  }
  if (!hasField(schemaArray, 'billing_status')) {
    toAdd.push({
      name: 'billing_status',
      type: 'select',
      required: false,
      options: {
        maxSelect: 1,
        values: ['trial', 'active', 'past_due', 'canceled', 'unpaid', 'locked'],
      },
    })
  }

  if (toAdd.length) {
    await pb.collections.update(sites.id, { schema: [...schemaArray, ...toAdd] })
    console.log('Added fields to sites:', toAdd.map((f) => f.name).join(', '))
  } else {
    console.log('Sites billing fields already present.')
  }

  const rows = await pb.collection('sites').getFullList({ batch: 500 })
  let n = 0
  for (const row of rows) {
    const hasTrial = row.trial_ends_at != null && String(row.trial_ends_at).trim() !== ''
    const hasStatus = row.billing_status != null && String(row.billing_status).trim() !== ''
    if (!hasTrial && !hasStatus) {
      await pb.collection('sites').update(row.id, { billing_status: 'active' })
      n += 1
    }
  }
  console.log(`Grandfathered ${n} existing site(s) as billing_status=active (no trial clock).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
