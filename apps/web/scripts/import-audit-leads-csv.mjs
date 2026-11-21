#!/usr/bin/env node
/**
 * Import prioritized site-audit prospect CSV into CRM as leads (funnel / pipeline "new").
 *
 *   cd apps/web
 *   POCKETBASE_URL=https://pb.webrankingreports.com \
 *   node scripts/import-audit-leads-csv.mjs "/path/to/leads.csv"
 *
 * Dry run: DRY_RUN=1
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
const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'doughigson@gmail.com').trim().toLowerCase()
const SOURCE_LABEL = (process.env.IMPORT_SOURCE || 'Site audit leads').trim()
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const csvPath = process.argv[2]

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !csvPath) {
  console.error('Usage: node scripts/import-audit-leads-csv.mjs /path/to.csv')
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
      } else inQuotes = !inQuotes
      cur += ch
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      if (cur.length) lines.push(cur)
      cur = ''
    } else cur += ch
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
      } else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((c) => c.replace(/^"|"$/g, '').trim())
}

function parseCsv(text) {
  const lines = splitCsvLines(text.replace(/^\uFEFF/, ''))
  if (!lines.length) return []
  const headers = parseCsvLine(lines[0])
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const cells = parseCsvLine(lines[i])
    const row = {}
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? '').trim()
    })
    if (Object.values(row).some((v) => v.length > 0)) rows.push(row)
  }
  return rows
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeWebsite(raw) {
  const w = (raw || '').trim()
  if (!w) return ''
  return w.startsWith('http') ? w : `https://${w}`
}

function tierTags(tier) {
  const t = (tier || '').trim()
  const tags = ['site audit']
  if (/tier\s*1/i.test(t)) tags.push('Tier 1')
  else if (/tier\s*2/i.test(t)) tags.push('Tier 2')
  else if (t) tags.push(t)
  return tags
}

function buildNotes(row) {
  const parts = []
  const web = normalizeWebsite(row.Website)
  if (web) parts.push(`Website: ${web}`)
  if (row['Priority Tier']) parts.push(`Priority: ${row['Priority Tier']}`)
  if (row['Phone Source URL']) parts.push(`Phone source: ${row['Phone Source URL']}`)
  if (row.Notes) parts.push(row.Notes)
  return parts.join('\n') || null
}

async function main() {
  const rows = parseCsv(readFileSync(csvPath, 'utf8'))
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)

  const esc = OWNER_EMAIL.replace(/"/g, '\\"')
  const owner = await pb.collection('users').getList(1, 1, { filter: `email = "${esc}"` })
  const ownerId = owner.items[0]?.id
  if (!ownerId) throw new Error(`No user for ${OWNER_EMAIL}`)

  const existing = await pb.collection('crm_clients').getFullList({ filter: `user = "${ownerId}"` })
  const byEmail = new Map()
  const byName = new Map()
  for (const r of existing) {
    const e = (r.email || '').trim().toLowerCase()
    if (e) byEmail.set(e, r)
    const n = (r.name || '').trim().toLowerCase()
    if (n) byName.set(n, r)
  }

  let created = 0
  let skipped = 0
  let updated = 0
  const errors = []

  console.log(`Owner ${OWNER_EMAIL} (${ownerId}), rows=${rows.length}${DRY_RUN ? ' [DRY RUN]' : ''}`)

  for (const row of rows) {
    const name = (row['Business Name'] || '').trim()
    if (!name) continue

    const email = (row.Email || '').trim().toLowerCase()
    const validEmail = email && EMAIL_RE.test(email) ? email : null
    const phone = (row.Phone || '').trim() || null
    const alt = (row['Alt Phone'] || '').trim() || null
    const nextStep = validEmail ? 'Send site audit / outreach' : 'Find phone or email; then audit'

    const dup =
      (validEmail && byEmail.get(validEmail)) ||
      (!validEmail && byName.get(name.toLowerCase()))

    if (dup) {
      if (dup.status === 'lead') {
        const mergedTags = [...new Set([...(dup.tags_json || []), ...tierTags(row['Priority Tier'])])]
        if (!DRY_RUN) {
          await pb.collection('crm_clients').update(dup.id, {
            phone: dup.phone || phone,
            cell_phone: dup.cell_phone || alt,
            notes: [dup.notes, buildNotes(row)].filter(Boolean).join('\n\n---\n\n') || dup.notes,
            tags_json: mergedTags,
            source: dup.source || SOURCE_LABEL,
            next_step: dup.next_step || nextStep,
          })
        }
        updated++
      } else {
        skipped++
      }
      continue
    }

    const payload = {
      user: ownerId,
      name,
      company: name,
      email: validEmail,
      phone,
      cell_phone: alt,
      status: 'lead',
      pipeline_stage: 'new',
      source: SOURCE_LABEL,
      next_step: nextStep,
      notes: buildNotes(row),
      website: normalizeWebsite(row.Website) || null,
      tags_json: tierTags(row['Priority Tier']),
    }

    if (DRY_RUN) {
      console.log('[dry]', name, validEmail || '(no email)', row['Priority Tier'] || '')
      created++
      if (validEmail) byEmail.set(validEmail, payload)
      byName.set(name.toLowerCase(), payload)
      continue
    }

    try {
      const rec = await pb.collection('crm_clients').create(payload)
      created++
      if (validEmail) byEmail.set(validEmail, rec)
      byName.set(name.toLowerCase(), rec)
    } catch (e) {
      errors.push(`${name}: ${e?.message || e}`)
    }
  }

  console.log({ created, updated, skipped, errors: errors.length })
  errors.forEach((e) => console.error(e))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})