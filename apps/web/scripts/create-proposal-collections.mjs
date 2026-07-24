#!/usr/bin/env node
/**
 * Idempotent bootstrap for proposal collections + sites.lifecycle.
 * Prefer PocketBase migrations when using migrate serve; this script helps Admin API setups.
 * Run from apps/web with PB admin credentials in env.
 */
import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

function loadEnv() {
  const dir = dirname(fileURLToPath(import.meta.url))
  for (const rel of ['..', '../..']) {
    const envPath = join(dir, rel, '.env')
    if (!existsSync(envPath)) continue
    const content = readFileSync(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    }
    break
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

async function adminAuth() {
  const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) {
    console.error('Admin login failed.', await res.text())
    process.exit(1)
  }
  return (await res.json()).token
}

function field(def) {
  return def
}

async function main() {
  const token = await adminAuth()
  const headers = { 'Content-Type': 'application/json', Authorization: token }
  const listRes = await fetch(`${PB_URL}/api/collections?perPage=500`, { headers })
  const listRaw = await listRes.json()
  const all = Array.isArray(listRaw) ? listRaw : listRaw.items || []
  const byName = Object.fromEntries(all.map((c) => [c.name, c]))
  const usersId = byName.users?.id || '_pb_users_auth_'
  const sitesId = byName.sites?.id
  const clientsId = byName.crm_clients?.id
  const salesId = byName.crm_sales?.id
  if (!sitesId || !clientsId || !salesId) {
    console.error('Missing sites / crm_clients / crm_sales')
    process.exit(1)
  }

  // sites.lifecycle
  const sites = byName.sites
  const siteSchema = [...(sites.schema || [])]
  if (!siteSchema.some((f) => f.name === 'lifecycle')) {
    siteSchema.push(
      field({
        name: 'lifecycle',
        type: 'select',
        required: false,
        options: { maxSelect: 1, values: ['prospect', 'active'] },
      }),
      field({ name: 'promoted_at', type: 'date', required: false, options: {} }),
      field({
        name: 'promoted_from_proposal',
        type: 'text',
        required: false,
        options: { max: 32, maxSize: 32 },
      }),
    )
    const r = await fetch(`${PB_URL}/api/collections/${sites.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ schema: siteSchema }),
    })
    if (!r.ok) console.error('sites lifecycle:', await r.text())
    else console.log('Updated sites.lifecycle')
  } else {
    console.log('sites.lifecycle already present')
  }

  // contact point kinds
  const cp = byName.crm_contact_points
  if (cp) {
    const kind = (cp.schema || []).find((f) => f.name === 'kind')
    const extras = [
      'proposal_created',
      'proposal_sent',
      'proposal_viewed',
      'proposal_accepted',
      'proposal_declined',
      'proposal_superseded',
    ]
    if (kind?.options?.values) {
      let changed = false
      for (const v of extras) {
        if (!kind.options.values.includes(v)) {
          kind.options.values.push(v)
          changed = true
        }
      }
      if (changed) {
        const r = await fetch(`${PB_URL}/api/collections/${cp.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ schema: cp.schema }),
        })
        if (!r.ok) console.error('contact kinds:', await r.text())
        else console.log('Updated crm_contact_points kinds')
      } else console.log('proposal contact kinds already present')
    }
  }

  if (!byName.proposals) {
    const schema = [
      { name: 'user', type: 'relation', required: true, options: { collectionId: usersId, cascadeDelete: true, maxSelect: 1 } },
      { name: 'client', type: 'relation', required: true, options: { collectionId: clientsId, cascadeDelete: true, maxSelect: 1 } },
      { name: 'sale', type: 'relation', required: true, options: { collectionId: salesId, cascadeDelete: true, maxSelect: 1 } },
      { name: 'site', type: 'relation', required: false, options: { collectionId: sitesId, cascadeDelete: false, maxSelect: 1 } },
      { name: 'version', type: 'number', required: true, options: { min: 1, noDecimal: true } },
      {
        name: 'status',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: ['draft', 'sent', 'viewed', 'accepted', 'declined', 'superseded', 'expired'],
        },
      },
      { name: 'title', type: 'text', required: true, options: { min: 1, max: 255, maxSize: 255 } },
      { name: 'intro_html', type: 'text', required: false, options: { max: 50000, maxSize: 50000 } },
      { name: 'terms_html', type: 'text', required: false, options: { max: 50000, maxSize: 50000 } },
      { name: 'currency', type: 'text', required: true, options: { min: 1, max: 8, maxSize: 8 } },
      { name: 'subtotal', type: 'number', required: false, options: {} },
      { name: 'total', type: 'number', required: false, options: {} },
      { name: 'valid_until', type: 'date', required: false, options: {} },
      { name: 'snapshot_json', type: 'json', required: false, options: { maxSize: 2000000 } },
      { name: 'branding_json', type: 'json', required: false, options: { maxSize: 200000 } },
      { name: 'public_token', type: 'text', required: false, options: { max: 64, maxSize: 64 } },
      { name: 'sent_at', type: 'date', required: false, options: {} },
      { name: 'viewed_at', type: 'date', required: false, options: {} },
      { name: 'accepted_at', type: 'date', required: false, options: {} },
      { name: 'declined_at', type: 'date', required: false, options: {} },
      { name: 'accepted_by_name', type: 'text', required: false, options: { max: 255, maxSize: 255 } },
      { name: 'accepted_by_email', type: 'text', required: false, options: { max: 255, maxSize: 255 } },
      { name: 'acceptance_options_json', type: 'json', required: false, options: { maxSize: 50000 } },
      { name: 'pdf_filename', type: 'text', required: false, options: { max: 255, maxSize: 255 } },
    ]
    const r = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'proposals',
        type: 'base',
        schema,
        listRule: 'user = @request.auth.id',
        viewRule: 'user = @request.auth.id',
        createRule: '@request.auth.id != ""',
        updateRule: 'user = @request.auth.id',
        deleteRule: 'user = @request.auth.id',
        indexes: [
          'CREATE INDEX idx_proposals_user ON proposals (user)',
          'CREATE INDEX idx_proposals_client ON proposals (client)',
          'CREATE INDEX idx_proposals_sale ON proposals (sale)',
          'CREATE UNIQUE INDEX idx_proposals_sale_version ON proposals (sale, version)',
          'CREATE INDEX idx_proposals_public_token ON proposals (public_token)',
        ],
      }),
    })
    if (!r.ok) {
      console.error('proposals:', await r.text())
      process.exit(1)
    }
    console.log('Created proposals')
  } else console.log('proposals already exists')

  const list2 = await (await fetch(`${PB_URL}/api/collections?perPage=500`, { headers })).json()
  const all2 = Array.isArray(list2) ? list2 : list2.items || []
  const proposalsCol = all2.find((c) => c.name === 'proposals')
  if (!all2.find((c) => c.name === 'proposal_items') && proposalsCol) {
    const schema = [
      { name: 'user', type: 'relation', required: true, options: { collectionId: usersId, cascadeDelete: true, maxSelect: 1 } },
      {
        name: 'proposal',
        type: 'relation',
        required: true,
        options: { collectionId: proposalsCol.id, cascadeDelete: true, maxSelect: 1 },
      },
      { name: 'sort_order', type: 'number', required: true, options: { min: 0, noDecimal: true } },
      { name: 'source', type: 'select', required: true, options: { maxSelect: 1, values: ['woo', 'manual', 'package'] } },
      { name: 'external_product_id', type: 'text', required: false, options: { max: 64, maxSize: 64 } },
      { name: 'sku', type: 'text', required: false, options: { max: 128, maxSize: 128 } },
      { name: 'name', type: 'text', required: true, options: { min: 1, max: 255, maxSize: 255 } },
      { name: 'description', type: 'text', required: false, options: { max: 5000, maxSize: 5000 } },
      { name: 'qty', type: 'number', required: true, options: { min: 0 } },
      { name: 'unit_price', type: 'number', required: true, options: {} },
      {
        name: 'billing_interval',
        type: 'select',
        required: false,
        options: { maxSelect: 1, values: ['one_time', 'month', 'year', 'custom'] },
      },
      { name: 'metadata_json', type: 'json', required: false, options: { maxSize: 200000 } },
    ]
    const r = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'proposal_items',
        type: 'base',
        schema,
        listRule: 'user = @request.auth.id',
        viewRule: 'user = @request.auth.id',
        createRule: '@request.auth.id != ""',
        updateRule: 'user = @request.auth.id',
        deleteRule: 'user = @request.auth.id',
        indexes: [
          'CREATE INDEX idx_proposal_items_user ON proposal_items (user)',
          'CREATE INDEX idx_proposal_items_proposal ON proposal_items (proposal)',
        ],
      }),
    })
    if (!r.ok) {
      console.error('proposal_items:', await r.text())
      process.exit(1)
    }
    console.log('Created proposal_items')
  } else console.log('proposal_items already exists (or proposals missing)')

  const list3 = await (await fetch(`${PB_URL}/api/collections?perPage=500`, { headers })).json()
  const all3 = Array.isArray(list3) ? list3 : list3.items || []
  const proposalsCol2 = all3.find((c) => c.name === 'proposals')
  const itemsCol = all3.find((c) => c.name === 'proposal_items')
  if (!all3.find((c) => c.name === 'proposal_products') && sitesId) {
    const schema = [
      { name: 'user', type: 'relation', required: true, options: { collectionId: usersId, cascadeDelete: true, maxSelect: 1 } },
      { name: 'catalog_site', type: 'relation', required: true, options: { collectionId: sitesId, cascadeDelete: true, maxSelect: 1 } },
      { name: 'external_id', type: 'text', required: true, options: { min: 1, max: 64, maxSize: 64 } },
      { name: 'sku', type: 'text', required: false, options: { max: 128, maxSize: 128 } },
      { name: 'name', type: 'text', required: true, options: { min: 1, max: 255, maxSize: 255 } },
      { name: 'description', type: 'text', required: false, options: { max: 10000, maxSize: 10000 } },
      { name: 'price', type: 'number', required: true, options: {} },
      { name: 'regular_price', type: 'number', required: false, options: {} },
      { name: 'sale_price', type: 'number', required: false, options: {} },
      { name: 'currency', type: 'text', required: false, options: { max: 8, maxSize: 8 } },
      { name: 'status', type: 'select', required: true, options: { maxSelect: 1, values: ['publish', 'draft', 'archived'] } },
      { name: 'woo_status', type: 'text', required: false, options: { max: 64, maxSize: 64 } },
      { name: 'image_url', type: 'text', required: false, options: { max: 2000, maxSize: 2000 } },
      { name: 'permalink', type: 'text', required: false, options: { max: 2000, maxSize: 2000 } },
      { name: 'raw_json', type: 'json', required: false, options: { maxSize: 500000 } },
      { name: 'synced_at', type: 'date', required: false, options: {} },
    ]
    const r = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'proposal_products',
        type: 'base',
        schema,
        listRule: 'user = @request.auth.id',
        viewRule: 'user = @request.auth.id',
        createRule: '@request.auth.id != ""',
        updateRule: 'user = @request.auth.id',
        deleteRule: 'user = @request.auth.id',
        indexes: [
          'CREATE INDEX idx_proposal_products_user ON proposal_products (user)',
          'CREATE INDEX idx_proposal_products_catalog ON proposal_products (catalog_site)',
          'CREATE UNIQUE INDEX idx_proposal_products_unique ON proposal_products (user, catalog_site, external_id)',
        ],
      }),
    })
    if (!r.ok) {
      console.error('proposal_products:', await r.text())
      process.exit(1)
    }
    console.log('Created proposal_products')
  } else console.log('proposal_products already exists')

  const list4 = await (await fetch(`${PB_URL}/api/collections?perPage=500`, { headers })).json()
  const all4 = Array.isArray(list4) ? list4 : list4.items || []
  const productsCol = all4.find((c) => c.name === 'proposal_products')
  const itemsCol2 = all4.find((c) => c.name === 'proposal_items')
  if (itemsCol2 && productsCol) {
    const schema = [...(itemsCol2.schema || [])]
    if (!schema.some((f) => f.name === 'product')) {
      schema.push({
        name: 'product',
        type: 'relation',
        required: false,
        options: { collectionId: productsCol.id, cascadeDelete: false, maxSelect: 1 },
      })
      const r = await fetch(`${PB_URL}/api/collections/${itemsCol2.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ schema }),
      })
      if (!r.ok) console.error('proposal_items.product:', await r.text())
      else console.log('Added proposal_items.product')
    }
  }

  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
