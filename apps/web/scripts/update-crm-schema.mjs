#!/usr/bin/env node
/**
 * Add CRM MVP fields and crm_tasks collection.
 * Run from apps/web with PB credentials in .env.
 * Idempotent: skips if crm_tasks exists and crm_clients has pipeline_stage.
 */
import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

function loadEnv() {
  const dir = dirname(fileURLToPath(import.meta.url))
  for (const rel of ['..', '../..']) {
    const envPath = join(dir, rel, '.env')
    if (!existsSync(envPath)) continue
    const content = readFileSync(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    }
    break
  }
}
loadEnv()

const PB_URL = (process.env.POCKETBASE_URL || process.env.PB_URL || 'http://127.0.0.1:8090').replace(/\/+$/, '')
if (PB_URL === 'http://127.0.0.1:8090') {
  console.error('Using default PB_URL (localhost). For production, set POCKETBASE_URL in apps/web/.env (e.g. POCKETBASE_URL=https://pb.webrankingreports.com) or run: POCKETBASE_URL=https://pb.webrankingreports.com node scripts/update-crm-schema.mjs')
}
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || process.env.PB_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || process.env.PB_ADMIN_PASSWORD

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD.')
  process.exit(1)
}

async function adminAuth() {
  const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  const body = await res.text()
  if (!res.ok) {
    console.error('Admin login failed.')
    process.exit(1)
  }
  return JSON.parse(body).token
}

async function main() {
  const token = await adminAuth()
  const headers = { 'Content-Type': 'application/json', Authorization: token }

  const listRes = await fetch(`${PB_URL}/api/collections?perPage=200`, { headers })
  const listRaw = await listRes.json()
  const all = Array.isArray(listRaw) ? listRaw : (listRaw.items || [])
  const usersCol = all.find((c) => c.name === 'users')
  const crmClients = all.find((c) => c.name === 'crm_clients')
  const crmSales = all.find((c) => c.name === 'crm_sales')
  const crmTasks = all.find((c) => c.name === 'crm_tasks')

  if (!usersCol || !crmClients) {
    console.error('Run create-crm-collections.mjs first.')
    process.exit(1)
  }

  // Ensure text/json fields have options.maxSize for PB API validation (PocketBase requires it)
  function normalizeSchema(schema) {
    return schema.map((f) => {
      const field = { ...f, options: f.options ? { ...f.options } : {} }
      if (field.type === 'text' || field.type === 'json') {
        const current = field.options.maxSize
        if (current === undefined || current === null || current === '') {
          field.options.maxSize = field.options.max ?? (field.type === 'text' ? 5000 : 2000000)
        }
      }
      return field
    })
  }

  const clientHasPipeline = (crmClients.schema || []).some((f) => f.name === 'pipeline_stage')

  if (!clientHasPipeline) {
    const schema = [...(crmClients.schema || [])]
    if (!schema.find((f) => f.name === 'pipeline_stage')) {
      schema.push({ name: 'pipeline_stage', type: 'select', required: true, options: { values: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'], maxSelect: 1 } })
    }
    if (!schema.find((f) => f.name === 'source')) schema.push({ name: 'source', type: 'text', required: false, options: { max: 255, maxSize: 255 } })
    if (!schema.find((f) => f.name === 'next_step')) schema.push({ name: 'next_step', type: 'text', required: false, options: { max: 2000, maxSize: 2000 } })
    if (!schema.find((f) => f.name === 'last_activity_at')) schema.push({ name: 'last_activity_at', type: 'date', required: false })
    if (!schema.find((f) => f.name === 'tags_json')) schema.push({ name: 'tags_json', type: 'json', required: false, options: { maxSize: 2000000 } })
    const r = await fetch(`${PB_URL}/api/collections/${crmClients.id}`, { method: 'PATCH', headers, body: JSON.stringify({ schema: normalizeSchema(schema) }) })
    if (!r.ok) {
      console.error('crm_clients update:', r.status, await r.text())
      process.exit(1)
    }
    console.log('Updated crm_clients schema.')
  }

  if (crmSales) {
    const schema = [...(crmSales.schema || [])]
    let updated = false
    if (!schema.find((f) => f.name === 'probability')) {
      schema.push({ name: 'probability', type: 'number', required: false, options: { min: 0, max: 100 } })
      updated = true
    }
    if (!schema.find((f) => f.name === 'expected_close_at')) {
      schema.push({ name: 'expected_close_at', type: 'date', required: false })
      updated = true
    }
    if (!schema.find((f) => f.name === 'services_proposed')) {
      schema.push({
        name: 'services_proposed',
        type: 'text',
        required: false,
        options: { max: 2000, maxSize: 2000 },
      })
      updated = true
    }
    if (updated) {
      const r = await fetch(`${PB_URL}/api/collections/${crmSales.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ schema: normalizeSchema(schema) }),
      })
      if (!r.ok) {
        console.error('crm_sales update:', r.status, await r.text())
        process.exit(1)
      }
      console.log('Updated crm_sales schema.')
    }
  }

  if (!crmTasks) {
    const body = {
      name: 'crm_tasks',
      type: 'base',
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id',
      schema: [
        { name: 'user', type: 'relation', required: true, options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: true } },
        { name: 'client', type: 'relation', required: true, options: { collectionId: crmClients.id, maxSelect: 1, cascadeDelete: true } },
        { name: 'title', type: 'text', required: true, options: { min: 1, max: 255, maxSize: 255 } },
        { name: 'due_at', type: 'date', required: true },
        { name: 'priority', type: 'select', required: true, options: { values: ['low', 'med', 'high'], maxSelect: 1 } },
        { name: 'status', type: 'select', required: true, options: { values: ['open', 'done'], maxSelect: 1 } },
        { name: 'notes', type: 'text', required: false, options: { max: 5000, maxSize: 5000 } },
      ],
    }
    const r = await fetch(`${PB_URL}/api/collections`, { method: 'POST', headers, body: JSON.stringify(body) })
    if (!r.ok) {
      console.error('crm_tasks create:', r.status, await r.text())
      process.exit(1)
    }
    console.log('Created collection: crm_tasks')
  }

  console.log('CRM schema update done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
