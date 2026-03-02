#!/usr/bin/env node
/**
 * Create only the collections that are often missing on production:
 * lead_forms, lead_submissions, crm_clients, crm_sales, crm_contact_points.
 * Uses only fetch() so it can run in a plain node container (no npm install).
 * Run: node scripts/create-missing-collections.mjs
 * Env: PB_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD (or PB_ADMIN_*)
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

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD (or PB_ADMIN_*).')
  process.exit(1)
}

async function auth() {
  const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) {
    console.error('Admin login failed:', res.status, await res.text())
    process.exit(1)
  }
  const data = await res.json()
  return data.token
}

async function listCollections(token) {
  const res = await fetch(`${PB_URL}/api/collections?perPage=200`, {
    headers: { Authorization: token },
  })
  if (!res.ok) {
    console.error('List collections failed:', res.status, await res.text())
    process.exit(1)
  }
  const raw = await res.json()
  return Array.isArray(raw) ? raw : (raw.items || [])
}

async function createCollection(token, body) {
  const res = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function main() {
  console.log('Connecting to PocketBase at', PB_URL, '...')
  const token = await auth()
  const collections = await listCollections(token)

  const usersCol = collections.find((c) => c.name === 'users')
  const sitesCol = collections.find((c) => c.name === 'sites')
  if (!usersCol) {
    console.error('Users collection not found. PocketBase may not be set up.')
    process.exit(1)
  }
  if (!sitesCol) {
    console.error('Sites collection not found. Run the full create-collections.mjs first (with Node + pocketbase package).')
    process.exit(1)
  }

  const hasLeadForms = collections.some((c) => c.name === 'lead_forms')
  const hasLeadSubmissions = collections.some((c) => c.name === 'lead_submissions')
  const hasCrmClients = collections.some((c) => c.name === 'crm_clients')
  const hasCrmSales = collections.some((c) => c.name === 'crm_sales')
  const hasCrmContactPoints = collections.some((c) => c.name === 'crm_contact_points')

  if (hasLeadForms && hasLeadSubmissions && hasCrmClients && hasCrmSales && hasCrmContactPoints) {
    console.log('All target collections already exist. DEV and PROD are in sync.')
    return
  }

  let leadFormsColId = collections.find((c) => c.name === 'lead_forms')?.id ?? null
  let crmClientsColId = collections.find((c) => c.name === 'crm_clients')?.id ?? null

  if (!hasLeadForms) {
    await createCollection(token, {
      name: 'lead_forms',
      type: 'base',
      listRule: '@request.auth.id != "" && site.user = @request.auth.id',
      viewRule: '@request.auth.id != "" && site.user = @request.auth.id',
      createRule: '@request.auth.id != "" && site.user = @request.auth.id',
      updateRule: 'site.user = @request.auth.id',
      deleteRule: 'site.user = @request.auth.id',
      schema: [
        { name: 'site', type: 'relation', required: true, options: { collectionId: sitesCol.id, maxSelect: 1, cascadeDelete: true } },
        { name: 'name', type: 'text', required: true, options: { min: 1, max: 255 } },
        { name: 'status', type: 'select', required: true, options: { values: ['draft', 'published'], maxSelect: 1 } },
        { name: 'fields_json', type: 'json', required: false, options: { maxSize: 500000 } },
        { name: 'conditional_json', type: 'json', required: false, options: { maxSize: 100000 } },
        { name: 'settings_json', type: 'json', required: false, options: { maxSize: 50000 } },
      ],
      indexes: ['CREATE INDEX idx_lead_forms_site ON lead_forms (site)'],
    })
    console.log('Created collection: lead_forms')
    const updated = await listCollections(token)
    leadFormsColId = updated.find((c) => c.name === 'lead_forms')?.id ?? null
  }

  if (!hasLeadSubmissions && leadFormsColId) {
    await createCollection(token, {
      name: 'lead_submissions',
      type: 'base',
      listRule: '@request.auth.id != "" && form.site.user = @request.auth.id',
      viewRule: '@request.auth.id != "" && form.site.user = @request.auth.id',
      createRule: '',
      updateRule: 'form.site.user = @request.auth.id',
      deleteRule: 'form.site.user = @request.auth.id',
      schema: [
        { name: 'form', type: 'relation', required: true, options: { collectionId: leadFormsColId, maxSelect: 1, cascadeDelete: true } },
        { name: 'submitted_at', type: 'date', required: true },
        { name: 'lead_name', type: 'text', required: false, options: { max: 500 } },
        { name: 'lead_email', type: 'text', required: false, options: { max: 500 } },
        { name: 'lead_phone', type: 'text', required: false, options: { max: 100 } },
        { name: 'lead_website', type: 'text', required: false, options: { max: 2000 } },
        { name: 'payload_json', type: 'json', required: false, options: { maxSize: 500000 } },
        { name: 'status', type: 'select', required: true, options: { values: ['new', 'processing', 'ready', 'error', 'archived'], maxSelect: 1 } },
        { name: 'audit_json', type: 'json', required: false, options: { maxSize: 2000000 } },
        { name: 'error_text', type: 'text', required: false, options: { max: 10000 } },
      ],
      indexes: ['CREATE INDEX idx_lead_submissions_form ON lead_submissions (form)', 'CREATE INDEX idx_lead_submissions_status ON lead_submissions (status)'],
    })
    console.log('Created collection: lead_submissions')
  }

  if (!hasCrmClients) {
    await createCollection(token, {
      name: 'crm_clients',
      type: 'base',
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id',
      schema: [
        { name: 'user', type: 'relation', required: true, options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: true } },
        { name: 'name', type: 'text', required: true, options: { min: 1, max: 255 } },
        { name: 'email', type: 'text', required: false, options: { max: 255 } },
        { name: 'phone', type: 'text', required: false, options: { max: 100 } },
        { name: 'company', type: 'text', required: false, options: { max: 255 } },
        { name: 'status', type: 'select', required: true, options: { values: ['lead', 'client', 'archived'], maxSelect: 1 } },
        { name: 'notes', type: 'text', required: false, options: { max: 10000 } },
      ],
      indexes: ['CREATE INDEX idx_crm_clients_user ON crm_clients (user)', 'CREATE INDEX idx_crm_clients_status ON crm_clients (status)'],
    })
    console.log('Created collection: crm_clients')
    const updated = await listCollections(token)
    crmClientsColId = updated.find((c) => c.name === 'crm_clients')?.id ?? null
  }

  if (!hasCrmSales && crmClientsColId) {
    await createCollection(token, {
      name: 'crm_sales',
      type: 'base',
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id',
      schema: [
        { name: 'user', type: 'relation', required: true, options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: true } },
        { name: 'client', type: 'relation', required: true, options: { collectionId: crmClientsColId, maxSelect: 1, cascadeDelete: true } },
        { name: 'title', type: 'text', required: true, options: { min: 1, max: 255 } },
        { name: 'amount', type: 'number', required: false },
        { name: 'status', type: 'select', required: true, options: { values: ['open', 'won', 'lost'], maxSelect: 1 } },
        { name: 'closed_at', type: 'date', required: false },
        { name: 'notes', type: 'text', required: false, options: { max: 5000 } },
      ],
      indexes: ['CREATE INDEX idx_crm_sales_user ON crm_sales (user)', 'CREATE INDEX idx_crm_sales_client ON crm_sales (client)'],
    })
    console.log('Created collection: crm_sales')
  }

  if (!hasCrmContactPoints && crmClientsColId) {
    await createCollection(token, {
      name: 'crm_contact_points',
      type: 'base',
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id',
      schema: [
        { name: 'user', type: 'relation', required: true, options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: true } },
        { name: 'client', type: 'relation', required: true, options: { collectionId: crmClientsColId, maxSelect: 1, cascadeDelete: true } },
        { name: 'kind', type: 'select', required: true, options: { values: ['call', 'email', 'meeting', 'note'], maxSelect: 1 } },
        { name: 'happened_at', type: 'date', required: true },
        { name: 'summary', type: 'text', required: false, options: { max: 5000 } },
      ],
      indexes: ['CREATE INDEX idx_crm_contact_points_user ON crm_contact_points (user)', 'CREATE INDEX idx_crm_contact_points_client ON crm_contact_points (client)'],
    })
    console.log('Created collection: crm_contact_points')
  }

  console.log('Done. DEV and PROD PocketBase collections are in sync.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
