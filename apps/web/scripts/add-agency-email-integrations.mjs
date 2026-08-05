#!/usr/bin/env node
/**
 * Create PocketBase collections for agency email sending (Google Gmail OAuth).
 * - agency_email_integrations
 * - agency_email_audit_events
 *
 * Run: node scripts/add-agency-email-integrations.mjs
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

async function postCollection(token, payload) {
  const res = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  if (res.ok) return
  let detail = text
  try {
    detail = JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    /* keep raw */
  }
  throw new Error(`HTTP ${res.status} creating ${payload.name}:\n${detail}`)
}

async function main() {
  const token = await auth()
  const listRes = await fetch(`${PB_URL}/api/collections?perPage=200`, { headers: { Authorization: token } })
  const raw = await listRes.json()
  const collections = Array.isArray(raw) ? raw : raw.items || []
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

  if (!collections.some((c) => c.name === 'agency_email_integrations')) {
    const schema = [
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
    const indexes = [
      'CREATE UNIQUE INDEX idx_agency_email_integrations_agency ON agency_email_integrations (agency)',
    ]
    try {
      await postCollection(token, {
        name: 'agency_email_integrations',
        type: 'base',
        ...lockedRules,
        schema,
        indexes,
      })
    } catch (e1) {
      console.warn('Create with indexes failed; retrying without indexes.\n', String(e1.message || e1).slice(0, 800))
      await postCollection(token, {
        name: 'agency_email_integrations',
        type: 'base',
        ...lockedRules,
        schema,
        indexes: [],
      })
    }
    console.log('Created collection: agency_email_integrations')
  } else {
    console.log('agency_email_integrations already exists.')
  }

  const refreshed = await (await fetch(`${PB_URL}/api/collections?perPage=200`, { headers: { Authorization: token } })).json()
  const cols2 = Array.isArray(refreshed) ? refreshed : refreshed.items || []

  if (!cols2.some((c) => c.name === 'agency_email_audit_events')) {
    const schema = [
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
    const indexes = ['CREATE INDEX idx_agency_email_audit_agency ON agency_email_audit_events (agency)']
    try {
      await postCollection(token, {
        name: 'agency_email_audit_events',
        type: 'base',
        ...lockedRules,
        schema,
        indexes,
      })
    } catch (e1) {
      console.warn('Create audit with indexes failed; retrying without indexes.\n', String(e1.message || e1).slice(0, 800))
      await postCollection(token, {
        name: 'agency_email_audit_events',
        type: 'base',
        ...lockedRules,
        schema,
        indexes: [],
      })
    }
    console.log('Created collection: agency_email_audit_events')
  } else {
    console.log('agency_email_audit_events already exists.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
