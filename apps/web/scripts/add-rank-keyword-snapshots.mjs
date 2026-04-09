#!/usr/bin/env node
/**
 * Add rank_keyword_snapshots collection (position history per tracked keyword).
 * Run on production after deploy: cd apps/web && node scripts/add-rank-keyword-snapshots.mjs
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
  console.error('Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD.')
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

async function main() {
  const token = await auth()
  const res = await fetch(`${PB_URL}/api/collections?perPage=200`, {
    headers: { Authorization: token },
  })
  const raw = await res.json()
  const collections = Array.isArray(raw) ? raw : raw.items || []
  if (collections.some((c) => c.name === 'rank_keyword_snapshots')) {
    console.log('Collection rank_keyword_snapshots already exists.')
    process.exit(0)
  }
  const rkCol = collections.find((c) => c.name === 'rank_keywords')
  if (!rkCol) {
    console.error('rank_keywords collection not found. Run create-collections first.')
    process.exit(1)
  }

  const body = {
    name: 'rank_keyword_snapshots',
    type: 'base',
    listRule: '@request.auth.id != "" && rank_keyword.site.user = @request.auth.id',
    viewRule: '@request.auth.id != "" && rank_keyword.site.user = @request.auth.id',
    createRule: '@request.auth.id != "" && @request.auth.id = ""',
    updateRule: '@request.auth.id != "" && @request.auth.id = ""',
    deleteRule: '@request.auth.id != "" && rank_keyword.site.user = @request.auth.id',
    schema: [
      {
        name: 'rank_keyword',
        type: 'relation',
        required: true,
        options: { collectionId: rkCol.id, maxSelect: 1, cascadeDelete: true },
      },
      { name: 'position', type: 'number', required: true, options: { min: 0, max: null, noDecimal: true } },
      { name: 'fetched_at', type: 'date', required: true },
      { name: 'url', type: 'text', required: false, options: { min: 0, max: 2000 } },
    ],
    indexes: ['CREATE INDEX idx_rank_keyword_snapshots_kw ON rank_keyword_snapshots (rank_keyword)'],
  }

  const cr = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(body),
  })
  if (!cr.ok) {
    console.error('Create failed:', cr.status, await cr.text())
    process.exit(1)
  }
  console.log('Created collection: rank_keyword_snapshots')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
