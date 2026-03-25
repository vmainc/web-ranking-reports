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
  const sitesCol = all.find((c) => c.name === 'sites')
  const crmClients = all.find((c) => c.name === 'crm_clients')
  const crmSales = all.find((c) => c.name === 'crm_sales')
  const crmTasks = all.find((c) => c.name === 'crm_tasks')
  const todoTasks = all.find((c) => c.name === 'todo_tasks')

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

  // Optional: link client to one site (for onboarding / integrations)
  if (crmClients && sitesCol && !(crmClients.schema || []).some((f) => f.name === 'site')) {
    const schema = [...(crmClients.schema || [])]
    schema.push({ name: 'site', type: 'relation', required: false, options: { collectionId: sitesCol.id, maxSelect: 1 } })
    const r = await fetch(`${PB_URL}/api/collections/${crmClients.id}`, { method: 'PATCH', headers, body: JSON.stringify({ schema: normalizeSchema(schema) }) })
    if (!r.ok) {
      console.error('crm_clients site field:', r.status, await r.text())
      process.exit(1)
    }
    console.log('Added site relation to crm_clients.')
  }

  // Mailing address fields
  const addressFields = [
    { name: 'mailing_address_line1', max: 255 },
    { name: 'mailing_address_line2', max: 255 },
    { name: 'mailing_city', max: 120 },
    { name: 'mailing_state', max: 120 },
    { name: 'mailing_postal_code', max: 30 },
    { name: 'mailing_country', max: 120 },
  ]

  const hasAnyAddressField = addressFields.some((f) => (crmClients.schema || []).some((s) => s.name === f.name))
  if (!hasAnyAddressField) {
    const schema = [...(crmClients.schema || [])]
    for (const f of addressFields) {
      if (schema.some((s) => s.name === f.name)) continue
      schema.push({
        name: f.name,
        type: 'text',
        required: false,
        options: { max: f.max, maxSize: f.max },
      })
    }
    const r = await fetch(`${PB_URL}/api/collections/${crmClients.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ schema: normalizeSchema(schema) }),
    })
    if (!r.ok) {
      console.error('crm_clients mailing address schema update:', r.status, await r.text())
      process.exit(1)
    }
    console.log('Added mailing address fields to crm_clients schema.')
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
        // Site-scoped To Do tasks are created without a client.
        // We keep the `client` relation optional for backwards compatibility.
        { name: 'client', type: 'relation', required: false, options: { collectionId: crmClients.id, maxSelect: 1, cascadeDelete: true } },
        { name: 'site', type: 'relation', required: false, options: { collectionId: sitesCol.id, maxSelect: 1, cascadeDelete: true } },
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

  // If crm_tasks already exists, patch it so tasks can be created without a client
  // and optionally be linked to a site.
  if (crmTasks && sitesCol) {
    const existingSchema = crmTasks.schema || []
    const hasSite = existingSchema.some((f) => f.name === 'site')
    const hasClient = existingSchema.some((f) => f.name === 'client')

    const desiredSchema = existingSchema.map((f) => {
      if (f.name === 'client') return { ...f, required: false }
      return f
    })

    if (!hasSite) {
      desiredSchema.push({
        name: 'site',
        type: 'relation',
        required: false,
        options: { collectionId: sitesCol.id, maxSelect: 1, cascadeDelete: true },
      })
    }

    // Only patch if something changed; otherwise avoid unnecessary schema updates.
    const clientRequiredIsTrue = existingSchema.find((f) => f.name === 'client')?.required === true
    const needsPatch = !hasSite || clientRequiredIsTrue || !hasClient
    if (needsPatch) {
      const r = await fetch(`${PB_URL}/api/collections/${crmTasks.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ schema: normalizeSchema(desiredSchema) }),
      })
      if (!r.ok) {
        console.error('crm_tasks schema update:', r.status, await r.text())
        process.exit(1)
      }
      console.log('Updated crm_tasks schema (site + optional client).')
    }
  }

  // Ensure site To Do collection exists (separate from crm_tasks/clients).
  if (usersCol && sitesCol && !todoTasks) {
    const body = {
      name: 'todo_tasks',
      type: 'base',
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id',
      schema: [
        { name: 'user', type: 'relation', required: true, options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: true } },
        { name: 'site', type: 'relation', required: true, options: { collectionId: sitesCol.id, maxSelect: 1, cascadeDelete: true } },
        { name: 'title', type: 'text', required: true, options: { min: 1, max: 255, maxSize: 255 } },
        { name: 'due_at', type: 'date', required: true },
        { name: 'priority', type: 'select', required: true, options: { values: ['low', 'med', 'high'], maxSelect: 1 } },
        { name: 'status', type: 'select', required: true, options: { values: ['open', 'done'], maxSelect: 1 } },
        { name: 'notes', type: 'text', required: false, options: { max: 5000, maxSize: 5000 } },
      ],
      indexes: ['CREATE INDEX idx_todo_tasks_user ON todo_tasks (user)', 'CREATE INDEX idx_todo_tasks_site ON todo_tasks (site)'],
    }

    const r = await fetch(`${PB_URL}/api/collections`, { method: 'POST', headers, body: JSON.stringify(body) })
    if (!r.ok) {
      console.error('todo_tasks create:', r.status, await r.text())
      process.exit(1)
    }
    console.log('Created collection: todo_tasks')
  }

  console.log('CRM schema update done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
