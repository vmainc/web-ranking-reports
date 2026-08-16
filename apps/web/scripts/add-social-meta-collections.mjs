#!/usr/bin/env node
/**
 * Create PocketBase collections for Meta / social tracking:
 * - agency_integrations
 * - site_social_connections
 * - social_metric_snapshots
 *
 * Idempotent. Server admin SDK only (locked rules).
 *
 * Run: node scripts/add-social-meta-collections.mjs
 * Env: PB_URL / POCKETBASE_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD
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
  const data = await res.json()
  return data.token
}

async function listCollections(token) {
  const listRes = await fetch(`${PB_URL}/api/collections?perPage=500`, { headers: { Authorization: token } })
  if (!listRes.ok) throw new Error(`List collections failed: ${await listRes.text()}`)
  const raw = await listRes.json()
  return Array.isArray(raw) ? raw : raw.items || []
}

function isNameExistsError(err) {
  const s = String(err?.message || err || '')
  return /validation_collection_name_exists|Collection name must be unique/i.test(s)
}

async function postCollection(token, payload) {
  const res = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  if (res.ok) return
  const err = new Error(`HTTP ${res.status} creating ${payload.name}:\n${text}`)
  err.body = text
  throw err
}

async function ensureCollection(token, payload) {
  try {
    await postCollection(token, payload)
    console.log(`Created collection: ${payload.name}`)
  } catch (e) {
    if (isNameExistsError(e)) {
      console.log(`Collection already exists: ${payload.name}`)
      return
    }
    const cols = await listCollections(token)
    if (cols.some((c) => c.name === payload.name)) {
      console.warn(`Create reported error but ${payload.name} exists; continuing.`)
      return
    }
    if (payload.indexes?.length) {
      console.warn(`Create with indexes failed; retrying without indexes.`)
      await postCollection(token, { ...payload, indexes: [] })
      console.log(`Created collection: ${payload.name} (without indexes)`)
      return
    }
    throw e
  }
}

function text(name, max = 200, required = false) {
  return { name, type: 'text', required, options: { min: null, max, pattern: '' } }
}
function sel(name, values, required = true) {
  return { name, type: 'select', required, options: { maxSelect: 1, values } }
}
function rel(name, collectionId, required, cascadeDelete) {
  return {
    name,
    type: 'relation',
    required,
    options: { collectionId, cascadeDelete, minSelect: null, maxSelect: 1, displayFields: null },
  }
}

async function main() {
  const token = await auth()
  const collections = await listCollections(token)
  const usersCol = collections.find((c) => c.name === 'users')
  const sitesCol = collections.find((c) => c.name === 'sites')
  if (!usersCol || !sitesCol) {
    console.error('users and sites collections are required.')
    process.exit(1)
  }

  const locked = { listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null }

  await ensureCollection(token, {
    name: 'agency_integrations',
    type: 'base',
    ...locked,
    schema: [
      rel('agency', usersCol.id, true, true),
      sel('provider', ['meta']),
      text('external_user_id', 128),
      text('external_business_id', 128),
      text('display_name', 200),
      text('encrypted_access_token', 8000),
      text('token_expires_at', 40),
      text('scopes', 2000),
      sel('status', ['connected', 'expired', 'reconnect_required', 'error', 'disconnected']),
      text('last_verified_at', 40),
      text('last_error', 500),
      rel('created_by', usersCol.id, false, false),
      rel('updated_by', usersCol.id, false, false),
    ],
    indexes: ['CREATE UNIQUE INDEX idx_agency_integrations_agency_provider ON agency_integrations (agency, provider)'],
  })

  const afterInteg = await listCollections(token)
  const integCol = afterInteg.find((c) => c.name === 'agency_integrations')
  if (!integCol) throw new Error('agency_integrations missing after create')

  await ensureCollection(token, {
    name: 'site_social_connections',
    type: 'base',
    ...locked,
    schema: [
      rel('site', sitesCol.id, true, true),
      rel('agency_integration', integCol.id, false, false),
      sel('provider', ['meta']),
      sel('platform', ['facebook', 'instagram']),
      sel('asset_type', ['facebook_page', 'instagram_business_account', 'ad_account']),
      sel('access_type', ['public', 'authenticated']),
      text('external_asset_id', 200, true),
      text('external_parent_asset_id', 200),
      text('display_name', 200),
      text('username', 200),
      text('canonical_url', 500),
      text('encrypted_page_token', 8000),
      sel('status', ['active', 'metrics_unavailable', 'reconnect_required', 'error', 'disconnected']),
      text('last_synced_at', 40),
      text('last_error', 500),
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_site_social_conn_site_asset ON site_social_connections (site, provider, platform, asset_type)',
      'CREATE INDEX idx_site_social_conn_ext_asset ON site_social_connections (external_asset_id)',
    ],
  })

  const afterConn = await listCollections(token)
  const connCol = afterConn.find((c) => c.name === 'site_social_connections')
  if (!connCol) throw new Error('site_social_connections missing after create')

  await ensureCollection(token, {
    name: 'social_metric_snapshots',
    type: 'base',
    ...locked,
    schema: [
      rel('site', sitesCol.id, true, true),
      rel('social_connection', connCol.id, true, false),
      sel('provider', ['meta']),
      sel('platform', ['facebook', 'instagram']),
      sel('asset_type', ['facebook_page', 'instagram_business_account', 'ad_account']),
      text('metric_key', 120, true),
      { name: 'value', type: 'number', required: true, options: { min: null, max: null, noDecimal: false } },
      text('source', 80, true),
      { name: 'is_exact', type: 'bool', required: false, options: {} },
      { name: 'confidence', type: 'number', required: false, options: { min: null, max: null, noDecimal: false } },
      text('period_type', 40, true),
      text('period_start', 40, true),
      text('period_end', 40, true),
      text('collected_at', 40, true),
      text('snapshot_date', 40, true),
      text('dedupe_key', 400, true),
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_social_metric_snapshots_dedupe ON social_metric_snapshots (dedupe_key)',
      'CREATE INDEX idx_social_metric_snapshots_site_metric ON social_metric_snapshots (site, metric_key, snapshot_date)',
    ],
  })

  console.log('Done. Social Meta collections are ready (admin SDK only).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
