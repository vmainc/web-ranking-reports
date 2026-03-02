#!/usr/bin/env node
/**
 * Create only the CRM PocketBase collections (crm_clients, crm_sales, crm_contact_points).
 * Run from apps/web with PB credentials in .env, or from repo root with env vars set.
 *
 * Usage:
 *   cd apps/web && node scripts/create-crm-collections.mjs
 *
 * Or with env:
 *   PB_URL=https://pb.webrankingreports.com POCKETBASE_ADMIN_EMAIL=... POCKETBASE_ADMIN_PASSWORD=... node apps/web/scripts/create-crm-collections.mjs
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
  console.error('Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD (or PB_*).')
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
    console.error('Admin login failed. Check PB_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD.')
    console.error(body || '(empty)')
    process.exit(1)
  }
  return body
}

async function main() {
  console.log('Connecting to PocketBase at', PB_URL, '...')
  const authBody = await adminAuth()
  let token
  try {
    token = JSON.parse(authBody).token
  } catch {
    console.error('Invalid auth response')
    process.exit(1)
  }

  const collectionsRes = await fetch(`${PB_URL}/api/collections?perPage=200`, {
    headers: { Authorization: token },
  })
  if (!collectionsRes.ok) {
    console.error('Failed to list collections:', collectionsRes.status, await collectionsRes.text())
    process.exit(1)
  }
  const raw = await collectionsRes.json()
  const allCollections = Array.isArray(raw) ? raw : (raw.items || [])

  const usersCol = allCollections.find((c) => c.name === 'users')
  if (!usersCol) {
    console.error('Users collection not found. Run the full create-collections.mjs first.')
    process.exit(1)
  }

  const hasCrmClients = allCollections.some((c) => c.name === 'crm_clients')
  const hasCrmSales = allCollections.some((c) => c.name === 'crm_sales')
  const hasCrmContactPoints = allCollections.some((c) => c.name === 'crm_contact_points')

  if (hasCrmClients && hasCrmSales && hasCrmContactPoints) {
    console.log('CRM collections already exist. Nothing to do.')
    return
  }

  let crmClientsColId = allCollections.find((c) => c.name === 'crm_clients')?.id ?? null

  if (!hasCrmClients) {
    const body = {
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
    }
    const r = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(body),
    })
    if (!r.ok) {
      console.error('crm_clients:', r.status, await r.text())
      process.exit(1)
    }
    console.log('Created collection: crm_clients')
    const listRes = await fetch(`${PB_URL}/api/collections?perPage=200`, { headers: { Authorization: token } })
    const listRaw = await listRes.json()
    const list = Array.isArray(listRaw) ? listRaw : (listRaw.items || [])
    crmClientsColId = list.find((c) => c.name === 'crm_clients')?.id ?? null
  }

  if (!hasCrmSales && crmClientsColId) {
    const body = {
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
    }
    const r = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(body),
    })
    if (!r.ok) {
      console.error('crm_sales:', r.status, await r.text())
      process.exit(1)
    }
    console.log('Created collection: crm_sales')
  }

  if (!hasCrmContactPoints && crmClientsColId) {
    const body = {
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
    }
    const r = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(body),
    })
    if (!r.ok) {
      console.error('crm_contact_points:', r.status, await r.text())
      process.exit(1)
    }
    console.log('Created collection: crm_contact_points')
  }

  console.log('CRM collections ready.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
