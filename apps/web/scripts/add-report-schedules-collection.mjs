#!/usr/bin/env node
/**
 * Create PocketBase collection `report_schedules` for automated per-site reports.
 * Run: node scripts/add-report-schedules-collection.mjs
 * Env: PB_URL / POCKETBASE_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD
 * (loads apps/web/.env and ../../infra/.env like add-workspace-schema.mjs)
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
  if (collections.some((c) => c.name === 'report_schedules')) {
    console.log('report_schedules already exists.')
    return
  }

  const usersCol = collections.find((c) => c.name === 'users')
  const sitesCol = collections.find((c) => c.name === 'sites')
  if (!usersCol || !sitesCol) {
    console.error('users and sites collections required.')
    process.exit(1)
  }

  const body = {
    name: 'report_schedules',
    type: 'base',
    // Blank rules = only superusers (Admin API / server); app uses Nuxt + admin SDK.
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '',
    deleteRule: '',
    schema: [
      {
        name: 'site',
        type: 'relation',
        required: true,
        options: { collectionId: sitesCol.id, maxSelect: 1, cascadeDelete: true, displayFields: ['name', 'domain'] },
      },
      {
        name: 'frequency',
        type: 'select',
        required: true,
        options: { maxSelect: 1, values: ['daily', 'weekly', 'monthly'] },
      },
      {
        name: 'start_at',
        type: 'text',
        required: true,
        options: { min: 4, max: 40 },
      },
      {
        name: 'last_run_at',
        type: 'text',
        required: false,
        options: { min: 0, max: 40 },
      },
      {
        name: 'next_run_at',
        type: 'text',
        required: true,
        options: { min: 4, max: 40 },
      },
      {
        name: 'is_active',
        type: 'bool',
        required: false,
      },
      {
        name: 'created_by',
        type: 'relation',
        required: true,
        options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: false, displayFields: ['email', 'name'] },
      },
    ],
    indexes: [
      'CREATE INDEX idx_report_schedules_site ON report_schedules (site)',
      'CREATE INDEX idx_report_schedules_next ON report_schedules (next_run_at)',
    ],
  }

  const res = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  console.log('Created collection: report_schedules')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
