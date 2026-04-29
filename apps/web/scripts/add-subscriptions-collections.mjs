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
  const t = await res.text()
  if (!res.ok) throw new Error(t)
}

async function seedUsageLimits(token) {
  const listRes = await fetch(`${PB_URL}/api/collections/usage_limits/records?perPage=200`, {
    headers: { Authorization: token },
  })
  const listRaw = await listRes.json().catch(() => ({ items: [] }))
  const items = Array.isArray(listRaw?.items) ? listRaw.items : []
  const byPlan = new Map(items.map((r) => [String(r.plan || ''), r]))

  const seed = [
    { plan: 'free', max_sites: 1, max_keywords: 5, max_contacts: 10, max_reports_per_month: 1, white_label: false, branding_required: true },
    { plan: 'starter', max_sites: 1, max_keywords: 25, max_contacts: 100, max_reports_per_month: 10, white_label: false, branding_required: false },
    { plan: 'growth', max_sites: 3, max_keywords: 100, max_contacts: 500, max_reports_per_month: 50, white_label: true, branding_required: false },
    { plan: 'agency', max_sites: 10, max_keywords: 500, max_contacts: 2000, max_reports_per_month: 200, white_label: true, branding_required: false },
  ]

  for (const row of seed) {
    const existing = byPlan.get(row.plan)
    if (existing?.id) {
      await fetch(`${PB_URL}/api/collections/usage_limits/records/${existing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify(row),
      })
    } else {
      await fetch(`${PB_URL}/api/collections/usage_limits/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify(row),
      })
    }
  }
}

async function main() {
  const token = await auth()
  const cols = await listCollections(token)
  const usersCol = cols.find((c) => c.name === 'users')
  if (!usersCol) throw new Error('users collection required')

  if (!cols.find((c) => c.name === 'subscriptions')) {
    await createCollection(token, {
      name: 'subscriptions',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      schema: [
        { name: 'user', type: 'relation', required: true, options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: true } },
        { name: 'plan', type: 'text', required: true, options: { min: 1, max: 32 } },
        { name: 'stripe_customer_id', type: 'text', required: false, options: { max: 120 } },
        { name: 'stripe_subscription_id', type: 'text', required: false, options: { max: 120 } },
        { name: 'status', type: 'text', required: true, options: { min: 1, max: 32 } },
        { name: 'current_period_end', type: 'date', required: false },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_subscriptions_user ON subscriptions (user)'],
    })
    console.log('Created: subscriptions')
  } else {
    console.log('subscriptions already exists')
  }

  if (!cols.find((c) => c.name === 'usage_limits')) {
    await createCollection(token, {
      name: 'usage_limits',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      schema: [
        { name: 'plan', type: 'text', required: true, options: { min: 1, max: 32 } },
        { name: 'max_sites', type: 'number', required: true, options: {} },
        { name: 'max_keywords', type: 'number', required: true, options: {} },
        { name: 'max_contacts', type: 'number', required: true, options: {} },
        { name: 'max_reports_per_month', type: 'number', required: true, options: {} },
        { name: 'white_label', type: 'bool', required: true, options: {} },
        { name: 'branding_required', type: 'bool', required: true, options: {} },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_usage_limits_plan ON usage_limits (plan)'],
    })
    console.log('Created: usage_limits')
  } else {
    console.log('usage_limits already exists')
  }

  if (!cols.find((c) => c.name === 'subscription_usage_events')) {
    await createCollection(token, {
      name: 'subscription_usage_events',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      schema: [
        { name: 'user', type: 'relation', required: true, options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: true } },
        { name: 'type', type: 'text', required: true, options: { min: 1, max: 32 } },
      ],
      indexes: [
        'CREATE INDEX idx_sub_usage_user_type ON subscription_usage_events (user, type)',
        'CREATE INDEX idx_sub_usage_created ON subscription_usage_events (created)',
      ],
    })
    console.log('Created: subscription_usage_events')
  } else {
    console.log('subscription_usage_events already exists')
  }

  await seedUsageLimits(token)
  console.log('Seeded usage_limits')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

