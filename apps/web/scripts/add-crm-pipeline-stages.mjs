#!/usr/bin/env node
/**
 * Create crm_pipeline_stages and convert crm_clients.pipeline_stage to text
 * so workspaces can rename columns and add custom Sales stages.
 *
 * Idempotent. Env: PB_URL / POCKETBASE_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD
 * Run: node apps/web/scripts/add-crm-pipeline-stages.mjs
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
  return { name, type: 'number', required, options: { min: null, max: null, noDecimal: true } }
}
function bool(name) {
  return { name, type: 'bool', required: false, options: {} }
}

async function ensurePipelineStageIsText(token, clientsCol) {
  const schema = Array.isArray(clientsCol.schema) ? [...clientsCol.schema] : []
  const idx = schema.findIndex((f) => f.name === 'pipeline_stage')
  if (idx < 0) {
    schema.push(text('pipeline_stage', 80, false))
    console.log('Adding pipeline_stage text field to crm_clients')
  } else if (schema[idx].type === 'text') {
    console.log('crm_clients.pipeline_stage already text')
    return
  } else {
    schema[idx] = {
      ...schema[idx],
      type: 'text',
      required: false,
      options: { min: null, max: 80, pattern: '' },
    }
    console.log('Converting crm_clients.pipeline_stage from select → text')
  }
  const res = await fetch(`${PB_URL}/api/collections/${clientsCol.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({ schema }),
  })
  if (!res.ok) throw new Error(`Failed updating crm_clients schema: ${await res.text()}`)
  console.log('crm_clients.pipeline_stage is text')
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
    name: 'crm_pipeline_stages',
    type: 'base',
    ...locked,
    schema: [
      rel('user', usersCol.id, true, true),
      text('key', 80, true),
      text('label', 120, true),
      num('sort_order'),
      bool('is_default'),
    ],
    indexes: [
      'CREATE INDEX idx_crm_pipeline_stages_user ON crm_pipeline_stages (user)',
      'CREATE UNIQUE INDEX idx_crm_pipeline_stages_user_key ON crm_pipeline_stages (user, key)',
    ],
  })

  await ensurePipelineStageIsText(token, clientsCol)
  console.log('CRM Sales pipeline stages ready.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
