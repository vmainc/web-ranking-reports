#!/usr/bin/env node
/**
 * Create PocketBase collections for agency email sending (Google Gmail OAuth).
 * - agency_email_integrations
 * - agency_email_audit_events
 *
 * Idempotent. Safe if a prior run created the collection but failed on indexes.
 *
 * Run: node scripts/add-agency-email-integrations.mjs
 * Env: PB_URL / POCKETBASE_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD
 * VPS: ./infra/run-agency-email-collections.sh
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

function isMissingCollectionError(err) {
  const s = String(err?.message || err || '')
  return /Missing collection|wasn't found|404/i.test(s) && !isNameExistsError(err)
}

async function postCollection(token, payload) {
  const res = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  if (res.ok) return { created: true, body: text }
  let detail = text
  try {
    detail = JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    /* keep raw */
  }
  const err = new Error(`HTTP ${res.status} creating ${payload.name}:\n${detail}`)
  err.status = res.status
  err.body = text
  throw err
}

async function ensureCollection(token, payload) {
  try {
    await postCollection(token, payload)
    console.log(`Created collection: ${payload.name}`)
    return 'created'
  } catch (e1) {
    if (isNameExistsError(e1)) {
      console.log(`Collection already exists (create raced / index failure): ${payload.name}`)
      return 'exists'
    }
    // Index failures sometimes still create the collection — check before retrying.
    const cols = await listCollections(token)
    if (cols.some((c) => c.name === payload.name)) {
      console.warn(
        `Create reported error but ${payload.name} exists; continuing.\n`,
        String(e1.message || e1).slice(0, 500),
      )
      return 'exists'
    }
    // Retry without indexes (common PB failure mode)
    if (payload.indexes?.length) {
      console.warn(`Create with indexes failed; retrying without indexes.\n`, String(e1.message || e1).slice(0, 800))
      try {
        await postCollection(token, { ...payload, indexes: [] })
        console.log(`Created collection: ${payload.name} (without indexes)`)
        return 'created'
      } catch (e2) {
        if (isNameExistsError(e2)) {
          console.log(`Collection already exists after retry: ${payload.name}`)
          return 'exists'
        }
        const cols2 = await listCollections(token)
        if (cols2.some((c) => c.name === payload.name)) {
          console.warn(`Retry failed but ${payload.name} exists; continuing.`)
          return 'exists'
        }
        throw e2
      }
    }
    throw e1
  }
}

function fieldNames(col) {
  const schema = col?.schema || col?.fields || []
  return new Set(schema.map((f) => f.name).filter(Boolean))
}

async function ensureFields(token, collectionName, desiredSchema) {
  const cols = await listCollections(token)
  const col = cols.find((c) => c.name === collectionName)
  if (!col) {
    throw new Error(`Collection ${collectionName} missing after create`)
  }
  const existing = fieldNames(col)
  const missing = desiredSchema.filter((f) => !existing.has(f.name))
  if (!missing.length) {
    console.log(`${collectionName}: schema OK (${existing.size} fields)`)
    return
  }
  console.log(`${collectionName}: adding missing fields: ${missing.map((f) => f.name).join(', ')}`)
  const schema = [...(col.schema || col.fields || []), ...missing]
  const patch = {
    ...col,
    schema,
  }
  // Avoid sending read-only / conflicting keys
  delete patch.fields
  const res = await fetch(`${PB_URL}/api/collections/${col.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({
      name: col.name,
      type: col.type,
      listRule: col.listRule,
      viewRule: col.viewRule,
      createRule: col.createRule,
      updateRule: col.updateRule,
      deleteRule: col.deleteRule,
      schema,
      indexes: col.indexes || [],
    }),
  })
  if (!res.ok) {
    throw new Error(`Failed to patch ${collectionName} fields: ${await res.text()}`)
  }
  console.log(`${collectionName}: fields updated`)
}

async function main() {
  const token = await auth()
  let collections = await listCollections(token)
  const usersCol = collections.find((c) => c.name === 'users')
  if (!usersCol) {
    console.error('users collection required.')
    process.exit(1)
  }

  const lockedRules = {
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
  }

  const integSchema = [
    {
      name: 'agency',
      type: 'relation',
      required: true,
      options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: true },
    },
    {
      name: 'provider',
      type: 'select',
      required: true,
      options: { values: ['system', 'google'], maxSelect: 1 },
    },
    {
      name: 'delivery_method',
      type: 'select',
      required: true,
      options: { values: ['system', 'google'], maxSelect: 1 },
    },
    { name: 'sender_email', type: 'text', required: false, options: { max: 320 } },
    { name: 'sender_name', type: 'text', required: false, options: { max: 120 } },
    { name: 'reply_to_email', type: 'text', required: false, options: { max: 320 } },
    { name: 'default_subject_template', type: 'text', required: false, options: { max: 500 } },
    { name: 'default_message_template', type: 'text', required: false, options: { max: 5000 } },
    { name: 'encrypted_access_token', type: 'text', required: false, options: { max: 8000 } },
    { name: 'encrypted_refresh_token', type: 'text', required: false, options: { max: 8000 } },
    { name: 'token_expiry', type: 'text', required: false, options: { max: 40 } },
    { name: 'scopes', type: 'text', required: false, options: { max: 2000 } },
    { name: 'google_account_id', type: 'text', required: false, options: { max: 128 } },
    {
      name: 'connection_status',
      type: 'select',
      required: true,
      options: {
        values: ['disconnected', 'connected', 'reconnect_required', 'error'],
        maxSelect: 1,
      },
    },
    { name: 'last_connected_at', type: 'text', required: false, options: { max: 40 } },
    { name: 'last_token_refresh_at', type: 'text', required: false, options: { max: 40 } },
    { name: 'last_successful_send_at', type: 'text', required: false, options: { max: 40 } },
    { name: 'last_send_error', type: 'text', required: false, options: { max: 500 } },
    { name: 'last_test_at', type: 'text', required: false, options: { max: 40 } },
    { name: 'last_test_status', type: 'text', required: false, options: { max: 40 } },
    {
      name: 'created_by',
      type: 'relation',
      required: false,
      options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: false },
    },
    {
      name: 'updated_by',
      type: 'relation',
      required: false,
      options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: false },
    },
  ]

  if (!collections.some((c) => c.name === 'agency_email_integrations')) {
    await ensureCollection(token, {
      name: 'agency_email_integrations',
      type: 'base',
      ...lockedRules,
      schema: integSchema,
      // Skip unique index — relation unique indexes are flaky across PB versions; app upserts by filter.
      indexes: [],
    })
  } else {
    console.log('agency_email_integrations already exists.')
  }

  await ensureFields(token, 'agency_email_integrations', integSchema)

  collections = await listCollections(token)

  const auditSchema = [
    {
      name: 'agency',
      type: 'relation',
      required: true,
      options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: true },
    },
    {
      name: 'actor',
      type: 'relation',
      required: false,
      options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: false },
    },
    {
      name: 'event_type',
      type: 'select',
      required: true,
      options: {
        values: [
          'google_connected',
          'google_reconnected',
          'google_disconnected',
          'delivery_method_changed',
          'test_email_sent',
          'test_email_failed',
        ],
        maxSelect: 1,
      },
    },
    { name: 'metadata_json', type: 'json', required: false, options: {} },
  ]

  if (!collections.some((c) => c.name === 'agency_email_audit_events')) {
    await ensureCollection(token, {
      name: 'agency_email_audit_events',
      type: 'base',
      ...lockedRules,
      schema: auditSchema,
      indexes: [],
    })
  } else {
    console.log('agency_email_audit_events already exists.')
  }

  await ensureFields(token, 'agency_email_audit_events', auditSchema)

  const final = await listCollections(token)
  for (const name of ['agency_email_integrations', 'agency_email_audit_events']) {
    console.log(`${name}:`, final.some((c) => c.name === name) ? 'OK' : 'MISSING')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
