/**
 * Verify PocketBase has collections required for CRM + website audit (read-only).
 * Usage (from apps/web): node scripts/check-pocketbase-collections.mjs
 */
import PocketBase from 'pocketbase'

const PB_URL = (process.env.PB_URL || process.env.NUXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090').replace(
  /\/+$/,
  '',
)
const email = process.env.PB_ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL
const password = process.env.PB_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD

const REQUIRED = [
  'users',
  'app_settings',
  'crm_clients',
  'website_audit_leads',
]

if (!email || !password) {
  console.error('Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD (or POCKETBASE_ADMIN_*)')
  process.exit(1)
}

const pb = new PocketBase(PB_URL)
await pb.admins.authWithPassword(email, password)

const collections = await pb.collections.getFullList()
const names = new Set(collections.map((c) => c.name))

let ok = true
for (const name of REQUIRED) {
  if (names.has(name)) {
    console.log(`OK   ${name}`)
  } else {
    console.log(`MISS ${name}`)
    ok = false
  }
}

const auditCol = collections.find((c) => c.name === 'website_audit_leads')
if (auditCol) {
  const fields = new Set((auditCol.fields || auditCol.schema || []).map((f) => f.name))
  for (const f of ['public_token', 'audit_json', 'status', 'user', 'website', 'email']) {
    if (fields.has(f)) console.log(`OK   website_audit_leads.${f}`)
    else {
      console.log(`MISS website_audit_leads.${f}`)
      ok = false
    }
  }
}

if (process.argv.includes('--sample-token')) {
  const token = process.argv[process.argv.indexOf('--sample-token') + 1]
  if (token) {
    try {
      const lead = await pb.collection('website_audit_leads').getFirstListItem(`public_token = "${token.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
      console.log(`OK   lead for token ${token.slice(0, 12)}… status=${lead.status} id=${lead.id}`)
    } catch (e) {
      console.log(`MISS lead public_token=${token}`)
      ok = false
    }
  }
}

process.exit(ok ? 0 : 1)
