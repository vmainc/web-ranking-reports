/**
 * Create website_audit_leads when PB migrations are not applied yet.
 * Usage (from apps/web): node scripts/add-website-audit-leads-collection.mjs
 */
import PocketBase from 'pocketbase'

const PB_URL = (process.env.PB_URL || process.env.NUXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090').replace(
  /\/+$/,
  '',
)
const email = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL
const password = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD

if (!email || !password) {
  console.error('Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD')
  process.exit(1)
}

const pb = new PocketBase(PB_URL)
await pb.admins.authWithPassword(email, password)

const collections = await pb.collections.getFullList()
if (collections.some((c) => c.name === 'website_audit_leads')) {
  console.log('website_audit_leads already exists')
  process.exit(0)
}

const usersCol = collections.find((c) => c.name === 'users' || c.type === 'auth')
const crmClients = collections.find((c) => c.name === 'crm_clients')
if (!usersCol || !crmClients) {
  console.error('users and crm_clients collections are required')
  process.exit(1)
}

const body = {
  name: 'website_audit_leads',
  type: 'base',
  listRule: 'user = @request.auth.id',
  viewRule: 'user = @request.auth.id',
  createRule: '',
  updateRule: 'user = @request.auth.id',
  deleteRule: 'user = @request.auth.id',
  schema: [
    {
      name: 'user',
      type: 'relation',
      required: true,
      options: { collectionId: usersCol.id, maxSelect: 1, cascadeDelete: true },
    },
    { name: 'name', type: 'text', required: false, options: { max: 500 } },
    { name: 'email', type: 'text', required: true, options: { max: 500 } },
    { name: 'phone', type: 'text', required: false, options: { max: 120 } },
    { name: 'website', type: 'text', required: true, options: { max: 2000 } },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: { values: ['received', 'processing', 'ready', 'error'], maxSelect: 1 },
    },
    { name: 'public_token', type: 'text', required: true, options: { max: 80 } },
    { name: 'audit_json', type: 'json', required: false, options: { maxSize: 2000000 } },
    {
      name: 'crm_client',
      type: 'relation',
      required: false,
      options: { collectionId: crmClients.id, maxSelect: 1, cascadeDelete: false },
    },
    { name: 'error_text', type: 'text', required: false, options: { max: 10000 } },
    { name: 'received_at', type: 'date', required: true },
    { name: 'email_sent_at', type: 'date', required: false },
    { name: 'payload_json', type: 'json', required: false, options: { maxSize: 200000 } },
  ],
  indexes: [
    'CREATE UNIQUE INDEX idx_website_audit_leads_token ON website_audit_leads (public_token)',
    'CREATE INDEX idx_website_audit_leads_user ON website_audit_leads (user)',
    'CREATE INDEX idx_website_audit_leads_crm ON website_audit_leads (crm_client)',
    'CREATE INDEX idx_website_audit_leads_status ON website_audit_leads (status)',
  ],
}

const res = await fetch(`${PB_URL}/api/collections`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token },
  body: JSON.stringify(body),
})
if (!res.ok) {
  console.error(await res.text())
  process.exit(1)
}
console.log('Created collection: website_audit_leads')
