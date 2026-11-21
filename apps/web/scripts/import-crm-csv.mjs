#!/usr/bin/env node
/**
 * Import CRM contacts from a QuickBooks-style customer CSV into a workspace owner account.
 *
 * Usage:
 *   cd apps/web
 *   POCKETBASE_URL=https://pb.webrankingreports.com \
 *   OWNER_EMAIL=admin@vma.agency \
 *   node scripts/import-crm-csv.mjs "/path/to/file.csv"
 *
 * Dry run: DRY_RUN=1 node scripts/import-crm-csv.mjs ...
 */

import PocketBase from 'pocketbase'
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
/** VMA day-to-day CRM lives on doughigson@gmail.com; admin@vma.agency is a separate login with its own CRM. */
const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'doughigson@gmail.com').trim().toLowerCase()
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const csvPath = process.argv[2]

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !csvPath) {
  console.error('Usage: OWNER_EMAIL=… node scripts/import-crm-csv.mjs /path/to.csv')
  console.error('Set POCKETBASE_ADMIN_* (or PB_*) in env or apps/web/.env')
  process.exit(1)
}

const pb = new PocketBase(PB_URL)

function splitCsvLines(text) {
  const lines = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      cur += ch
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      if (cur.length) lines.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.length) lines.push(cur)
  return lines
}

function parseCsvLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((c) => c.replace(/^"|"$/g, '').trim())
}

function parseCsv(text) {
  const lines = splitCsvLines(text.replace(/^\uFEFF/, ''))
  if (!lines.length) return { headers: [], rows: [] }
  const headers = parseCsvLine(lines[0]).map((h) => h.trim())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const cells = parseCsvLine(line)
    const row = {}
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? '').trim()
    })
    if (Object.values(row).some((v) => v.length > 0)) rows.push(row)
  }
  return { headers, rows }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function fixEmailTypos(raw) {
  let s = raw.trim()
  s = s.replace(/\.comwhatmatters\.com$/i, '.com')
  s = s.replace(/@([^\s@]+)@\1@/i, '@$1@')
  return s
}

function pickEmail(raw) {
  if (!raw?.trim()) return ''
  const parts = raw.split(/[,;]/).map((p) => fixEmailTypos(p.trim().toLowerCase())).filter(Boolean)
  for (const p of parts) {
    if (EMAIL_RE.test(p)) return p
  }
  const single = fixEmailTypos(raw.trim().toLowerCase())
  return EMAIL_RE.test(single) ? single : ''
}

function pickPhones(raw) {
  if (!raw?.trim()) return { phone: '', cell: '' }
  let cell = ''
  let phone = ''
  const mobile = raw.match(/Mobile:\s*([^,]+)/i)
  const phoneM = raw.match(/Phone:\s*([^,]+)/i)
  if (mobile) cell = mobile[1].replace(/\s+/g, ' ').trim()
  if (phoneM) phone = phoneM[1].replace(/\s+/g, ' ').trim()
  if (!phone && !cell && !/Phone:|Mobile:|Fax:/i.test(raw)) {
    phone = raw.replace(/\s+/g, ' ').trim()
  }
  return { phone, cell }
}

function splitFullName(full) {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return { first: '', last: '' }
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

function isJunkRow(row) {
  const name = (row['Client Name'] || '').trim()
  if (!name) return true
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(name) || /^Saturday,|^Sunday,|^Monday,/.test(name)) return true
  return false
}

async function adminAuth() {
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
}

async function resolveOwnerId() {
  const esc = OWNER_EMAIL.replace(/"/g, '\\"')
  const list = await pb.collection('users').getList(1, 1, { filter: `email = "${esc}"` })
  const user = list.items?.[0]
  if (!user?.id) throw new Error(`No user for OWNER_EMAIL=${OWNER_EMAIL}`)
  const sites = await pb.collection('sites').getList(1, 1, { filter: `user = "${user.id}"` }).catch(() => ({ items: [] }))
  if (sites.items?.length) return user.id
  const ao = user.agency_owner || user.expand?.agency_owner
  const ownerId = typeof ao === 'string' ? ao : ao?.id
  if (ownerId) return ownerId
  return user.id
}

async function main() {
  const text = readFileSync(csvPath, 'utf8')
  const { rows: rawRows } = parseCsv(text)
  const rows = rawRows.filter((r) => !isJunkRow(r))

  await adminAuth()
  const ownerId = await resolveOwnerId()
  console.log(`CRM owner: ${ownerId} (${OWNER_EMAIL})`)
  console.log(`Rows to process: ${rows.length}${DRY_RUN ? ' [DRY RUN]' : ''}`)

  const existing = await pb.collection('crm_clients').getFullList({ filter: `user = "${ownerId}"` })
  const existingEmails = new Set(
    existing.map((r) => (r.email || '').trim().toLowerCase()).filter(Boolean),
  )
  const existingNames = new Set(existing.map((r) => (r.name || '').trim().toLowerCase()).filter(Boolean))

  let created = 0
  let skipped = 0
  const errors = []

  for (const row of rows) {
    const clientName = (row['Client Name'] || '').trim()
    const email = pickEmail(row.Email || '')
    const { phone, cell } = pickPhones(row.Phone || '')
    const bill = (row['Bill address'] || '').trim()
    const ship = (row['Ship address'] || '').trim()
    const { first, last } = splitFullName(clientName)

    if (email && existingEmails.has(email)) {
      skipped++
      continue
    }
    if (!email && existingNames.has(clientName.toLowerCase())) {
      skipped++
      continue
    }

    const notesParts = []
    if (ship && ship !== bill) notesParts.push(`Ship: ${ship}`)
    if (row.Email?.trim() && !email) notesParts.push(`Original email field: ${row.Email.trim()}`)

    const payload = {
      user: ownerId,
      name: clientName,
      first_name: first || null,
      last_name: last || null,
      company: clientName,
      email: email || null,
      phone: phone || null,
      cell_phone: cell || null,
      status: 'client',
      pipeline_stage: 'won',
      source: 'QuickBooks customer list',
      tags_json: ['Previous client'],
      mailing_address_line1: bill || null,
      notes: notesParts.length ? notesParts.join('\n') : null,
    }

    if (DRY_RUN) {
      console.log('[dry]', clientName, email || '(no email)', phone || '')
      created++
      if (email) existingEmails.add(email)
      existingNames.add(clientName.toLowerCase())
      continue
    }

    try {
      await pb.collection('crm_clients').create(payload)
      created++
      if (email) existingEmails.add(email)
      existingNames.add(clientName.toLowerCase())
    } catch (e) {
      const msg = e?.data?.message || e?.message || String(e)
      errors.push(`${clientName}: ${msg}`)
      if (errors.length >= 30) break
    }
  }

  console.log(`Done. created=${created} skipped=${skipped} errors=${errors.length}`)
  for (const err of errors) console.error(err)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})