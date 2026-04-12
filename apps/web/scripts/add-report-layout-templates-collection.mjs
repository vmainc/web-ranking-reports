#!/usr/bin/env node
/**
 * PocketBase collection `report_layout_templates` — user-saved full-report section layouts for reuse across sites.
 * Run: node scripts/add-report-layout-templates-collection.mjs
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
  if (collections.some((c) => c.name === 'report_layout_templates')) {
    console.log('report_layout_templates already exists.')
    return
  }

  const usersCol = collections.find((c) => c.name === 'users')
  if (!usersCol) {
    console.error('users collection required.')
    process.exit(1)
  }

  const ownerRule = '@request.auth.id != "" && user = @request.auth.id'

  const body = {
    name: 'report_layout_templates',
    type: 'base',
    listRule: ownerRule,
    viewRule: ownerRule,
    createRule: ownerRule,
    updateRule: ownerRule,
    deleteRule: ownerRule,
    schema: [
      {
        name: 'user',
        type: 'relation',
        required: true,
        options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: true, displayFields: ['email', 'name'] },
      },
      {
        name: 'name',
        type: 'text',
        required: true,
        options: { min: 1, max: 200 },
      },
      {
        name: 'sections',
        type: 'json',
        required: true,
        options: { maxSize: 500000 },
      },
    ],
    indexes: ['CREATE INDEX idx_report_layout_templates_user ON report_layout_templates (user)'],
  }

  const res = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  console.log('Created collection: report_layout_templates')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
