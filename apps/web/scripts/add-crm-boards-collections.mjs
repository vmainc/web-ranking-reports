#!/usr/bin/env node
/**
 * Create PocketBase collections for shared CRM Trello-style boards:
 * - crm_boards
 * - crm_board_lists
 * - crm_board_cards
 *
 * Idempotent. Server admin SDK only (locked rules).
 *
 * Run: node apps/web/scripts/add-crm-boards-collections.mjs
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
function rel(name, collectionId, required, cascadeDelete) {
  return {
    name,
    type: 'relation',
    required,
    options: { collectionId, cascadeDelete, minSelect: null, maxSelect: 1, displayFields: null },
  }
}
function num(name, required = false) {
  return { name, type: 'number', required, options: { min: null, max: null, noDecimal: false } }
}
function bool(name) {
  return { name, type: 'bool', required: false, options: {} }
}

async function main() {
  const token = await auth()
  const collections = await listCollections(token)
  const usersCol = collections.find((c) => c.name === 'users')
  const clientsCol = collections.find((c) => c.name === 'crm_clients')
  if (!usersCol || !clientsCol) {
    console.error('users and crm_clients collections are required.')
    process.exit(1)
  }

  const locked = { listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null }

  await ensureCollection(token, {
    name: 'crm_boards',
    type: 'base',
    ...locked,
    schema: [
      rel('user', usersCol.id, true, true),
      text('name', 120, true),
      num('sort_order'),
      bool('is_default'),
    ],
    indexes: ['CREATE INDEX idx_crm_boards_user ON crm_boards (user)'],
  })

  const afterBoards = await listCollections(token)
  const boardsCol = afterBoards.find((c) => c.name === 'crm_boards')
  if (!boardsCol) throw new Error('crm_boards missing after create')

  await ensureCollection(token, {
    name: 'crm_board_lists',
    type: 'base',
    ...locked,
    schema: [
      rel('user', usersCol.id, true, true),
      rel('board', boardsCol.id, true, true),
      text('name', 120, true),
      num('sort_order'),
    ],
    indexes: ['CREATE INDEX idx_crm_board_lists_board ON crm_board_lists (board)'],
  })

  const afterLists = await listCollections(token)
  const listsCol = afterLists.find((c) => c.name === 'crm_board_lists')
  if (!listsCol) throw new Error('crm_board_lists missing after create')

  await ensureCollection(token, {
    name: 'crm_board_cards',
    type: 'base',
    ...locked,
    schema: [
      rel('user', usersCol.id, true, true),
      rel('board', boardsCol.id, true, true),
      rel('list', listsCol.id, true, true),
      text('title', 255, true),
      text('description', 5000),
      rel('client', clientsCol.id, false, false),
      num('sort_order'),
    ],
    indexes: [
      'CREATE INDEX idx_crm_board_cards_board ON crm_board_cards (board)',
      'CREATE INDEX idx_crm_board_cards_list ON crm_board_cards (list)',
    ],
  })

  console.log('CRM boards collections ready.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
