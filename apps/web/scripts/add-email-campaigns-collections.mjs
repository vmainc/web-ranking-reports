#!/usr/bin/env node
/**
 * Create PocketBase collections `email_campaigns` and `email_recipients`.
 * Run: node scripts/add-email-campaigns-collections.mjs
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

async function main() {
  const token = await auth()
  const listRes = await fetch(`${PB_URL}/api/collections?perPage=200`, { headers: { Authorization: token } })
  const raw = await listRes.json()
  const collections = Array.isArray(raw) ? raw : raw.items || []

  const usersCol = collections.find((c) => c.name === 'users')
  const crmCol = collections.find((c) => c.name === 'crm_clients')
  if (!usersCol || !crmCol) {
    console.error('users and crm_clients collections required.')
    process.exit(1)
  }

  if (!collections.some((c) => c.name === 'email_campaigns')) {
    const body = {
      name: 'email_campaigns',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      schema: [
        { name: 'name', type: 'text', required: true, options: { min: 1, max: 200 } },
        { name: 'subject', type: 'text', required: true, options: { min: 1, max: 500 } },
        { name: 'body_html', type: 'text', required: true, options: { min: 1, max: 200000 } },
        {
          name: 'status',
          type: 'select',
          required: true,
          options: { maxSelect: 1, values: ['draft', 'scheduled', 'sending', 'sent'] },
        },
        { name: 'send_at', type: 'text', required: false, options: { min: 0, max: 40 } },
        { name: 'sent_at', type: 'text', required: false, options: { min: 0, max: 40 } },
        {
          name: 'created_by',
          type: 'relation',
          required: true,
          options: {
            collectionId: usersCol.id,
            maxSelect: 1,
            cascadeDelete: false,
            displayFields: ['email', 'name'],
          },
        },
      ],
      indexes: [
        'CREATE INDEX idx_email_campaigns_created_by ON email_campaigns (created_by)',
        'CREATE INDEX idx_email_campaigns_status_send ON email_campaigns (status, send_at)',
      ],
    }
    const res = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await res.text())
    console.log('Created collection: email_campaigns')
  } else {
    console.log('email_campaigns already exists.')
  }

  const listRes2 = await fetch(`${PB_URL}/api/collections?perPage=200`, { headers: { Authorization: token } })
  const raw2 = await listRes2.json()
  const collections2 = Array.isArray(raw2) ? raw2 : raw2.items || []
  const campaignsCol = collections2.find((c) => c.name === 'email_campaigns')

  if (!collections2.some((c) => c.name === 'email_recipients')) {
    const body = {
      name: 'email_recipients',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      schema: [
        {
          name: 'campaign',
          type: 'relation',
          required: true,
          options: {
            collectionId: campaignsCol.id,
            maxSelect: 1,
            cascadeDelete: true,
            displayFields: ['name', 'subject'],
          },
        },
        {
          name: 'contact',
          type: 'relation',
          required: true,
          options: {
            collectionId: crmCol.id,
            maxSelect: 1,
            cascadeDelete: false,
            displayFields: ['name', 'email'],
          },
        },
        { name: 'email', type: 'text', required: true, options: { min: 3, max: 320 } },
        {
          name: 'status',
          type: 'select',
          required: true,
          options: { maxSelect: 1, values: ['pending', 'sent', 'failed'] },
        },
        { name: 'sent_at', type: 'text', required: false, options: { min: 0, max: 40 } },
      ],
      indexes: [
        'CREATE INDEX idx_email_recipients_campaign ON email_recipients (campaign)',
        'CREATE INDEX idx_email_recipients_campaign_status ON email_recipients (campaign, status)',
      ],
    }
    const res = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await res.text())
    console.log('Created collection: email_recipients')
  } else {
    console.log('email_recipients already exists.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
