#!/usr/bin/env node
/**
 * Add missing fields to `report_schedules`:
 * - report (relation -> reports)
 * - from_email (text)
 * - to_email (text)
 *
 * Run: node scripts/upgrade-report-schedules-fields.mjs
 * Uses collection `schema` + PATCH `{ schema }` (PocketBase 0.22), not `fields`.
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

async function getCollections(token) {
  const listRes = await fetch(`${PB_URL}/api/collections?perPage=200`, { headers: { Authorization: token } })
  const raw = await listRes.json()
  return Array.isArray(raw) ? raw : raw.items || []
}

async function main() {
  const token = await auth()
  const collections = await getCollections(token)
  const schedules = collections.find((c) => c.name === 'report_schedules')
  const reports = collections.find((c) => c.name === 'reports')
  if (!schedules) throw new Error('report_schedules collection not found')
  if (!reports) throw new Error('reports collection not found')

  const fields = Array.isArray(schedules.schema)
    ? schedules.schema
    : Array.isArray(schedules.fields)
      ? schedules.fields
      : []
  const has = (name) => fields.some((f) => f?.name === name)

  const nextSchema = [...fields]
  if (!has('report')) {
    nextSchema.push({
      name: 'report',
      type: 'relation',
      required: false,
      options: { collectionId: reports.id, maxSelect: 1, cascadeDelete: true },
    })
  }
  if (!has('from_email')) {
    nextSchema.push({ name: 'from_email', type: 'text', required: false, options: { max: 320 } })
  }
  if (!has('to_email')) {
    nextSchema.push({ name: 'to_email', type: 'text', required: false, options: { max: 320 } })
  }

  if (nextSchema.length === fields.length) {
    console.log('report_schedules already has required fields.')
    return
  }

  const res = await fetch(`${PB_URL}/api/collections/${schedules.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({ schema: nextSchema }),
  })
  const errText = await res.text()
  if (!res.ok) {
    let detail = errText
    try {
      detail = JSON.stringify(JSON.parse(errText), null, 2)
    } catch {
      /* keep raw */
    }
    throw new Error(`HTTP ${res.status} PATCH report_schedules:\n${detail}`)
  }
  console.log('Updated report_schedules fields.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

