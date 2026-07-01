/** CRM contact fields supported for CSV import / export. */
export const CRM_IMPORT_FIELD_IDS = [
  'name_prefix',
  'first_name',
  'last_name',
  'full_name',
  'email',
  'business_phone',
  'cell_phone',
  'phone',
  'company',
  'status',
  'pipeline_stage',
  'source',
  'notes',
  'next_step',
  'mailing_address_line1',
  'mailing_address_line2',
  'mailing_city',
  'mailing_state',
  'mailing_postal_code',
  'mailing_country',
  'tags',
] as const

export type CrmImportFieldId = (typeof CRM_IMPORT_FIELD_IDS)[number]

export const CRM_IMPORT_FIELDS: Array<{ id: CrmImportFieldId; label: string; hint?: string }> = [
  { id: 'name_prefix', label: 'Prefix' },
  { id: 'first_name', label: 'First name' },
  { id: 'last_name', label: 'Last name' },
  { id: 'full_name', label: 'Full name', hint: 'Used when first/last are not separate columns' },
  { id: 'email', label: 'Email' },
  { id: 'business_phone', label: 'Business phone' },
  { id: 'cell_phone', label: 'Cell phone' },
  { id: 'phone', label: 'Phone (generic)' },
  { id: 'company', label: 'Company' },
  { id: 'status', label: 'Status', hint: 'lead, client/customer, or archived' },
  { id: 'pipeline_stage', label: 'Pipeline stage' },
  { id: 'source', label: 'Source' },
  { id: 'notes', label: 'Notes' },
  { id: 'next_step', label: 'Next step' },
  { id: 'mailing_address_line1', label: 'Address line 1' },
  { id: 'mailing_address_line2', label: 'Address line 2' },
  { id: 'mailing_city', label: 'City' },
  { id: 'mailing_state', label: 'State' },
  { id: 'mailing_postal_code', label: 'Postal code' },
  { id: 'mailing_country', label: 'Country' },
  { id: 'tags', label: 'Tags', hint: 'Comma- or semicolon-separated' },
]

export const CRM_EXPORT_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'name_prefix', label: 'Prefix' },
  { key: 'first_name', label: 'First name' },
  { key: 'last_name', label: 'Last name' },
  { key: 'name', label: 'Full name' },
  { key: 'email', label: 'Email' },
  { key: 'business_phone', label: 'Business phone' },
  { key: 'cell_phone', label: 'Cell phone' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'status', label: 'Status' },
  { key: 'pipeline_stage', label: 'Pipeline stage' },
  { key: 'source', label: 'Source' },
  { key: 'notes', label: 'Notes' },
  { key: 'next_step', label: 'Next step' },
  { key: 'mailing_address_line1', label: 'Address line 1' },
  { key: 'mailing_address_line2', label: 'Address line 2' },
  { key: 'mailing_city', label: 'City' },
  { key: 'mailing_state', label: 'State' },
  { key: 'mailing_postal_code', label: 'Postal code' },
  { key: 'mailing_country', label: 'Country' },
  { key: 'tags_json', label: 'Tags' },
  { key: 'last_activity_at', label: 'Last contact' },
]

export type CrmColumnMapping = Partial<Record<CrmImportFieldId, string | null>>

export interface ParsedCsv {
  headers: string[]
  rows: Record<string, string>[]
}

/** Parse CSV text into headers + row objects keyed by header. */
export function parseCsv(text: string): ParsedCsv {
  const lines = splitCsvLines(text.replace(/^\uFEFF/, ''))
  if (!lines.length) return { headers: [], rows: [] }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const cells = parseCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? '').trim()
    })
    if (Object.values(row).some((v) => v.length > 0)) rows.push(row)
  }
  return { headers, rows }
}

function splitCsvLines(text: string): string[] {
  const lines: string[] = []
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

function parseCsvLine(line: string): string[] {
  const out: string[] = []
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

export function escapeCsvCell(value: unknown): string {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function rowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const headerLine = headers.map(escapeCsvCell).join(',')
  const body = rows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(','))
  return [headerLine, ...body].join('\r\n')
}

function splitFullName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return { first: '', last: '' }
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

export function normalizeImportStatus(raw: string | undefined): 'lead' | 'client' | 'archived' | undefined {
  if (!raw?.trim()) return undefined
  const s = raw.trim().toLowerCase()
  if (['lead', 'prospect', 'new'].includes(s)) return 'lead'
  if (['client', 'customer', 'active', 'won'].includes(s)) return 'client'
  if (['archived', 'inactive', 'lost', 'closed'].includes(s)) return 'archived'
  return undefined
}

const PIPELINE_STAGES = new Set(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'])

export function normalizePipelineStage(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined
  const s = raw.trim().toLowerCase()
  return PIPELINE_STAGES.has(s) ? s : undefined
}

export interface MappedContactRow {
  name_prefix?: string
  first_name?: string
  last_name?: string
  name: string
  email?: string
  business_phone?: string
  cell_phone?: string
  phone?: string
  company?: string
  status: 'lead' | 'client' | 'archived'
  pipeline_stage: string
  source?: string
  notes?: string
  next_step?: string
  mailing_address_line1?: string
  mailing_address_line2?: string
  mailing_city?: string
  mailing_state?: string
  mailing_postal_code?: string
  mailing_country?: string
  tags_json?: string[]
}

export function mapRowToContact(
  sourceRow: Record<string, string>,
  mapping: CrmColumnMapping,
  defaults?: { status?: 'lead' | 'client' | 'archived' },
): MappedContactRow | null {
  const get = (field: CrmImportFieldId): string => {
    const col = mapping[field]
    if (!col) return ''
    return (sourceRow[col] ?? '').trim()
  }

  let first_name = get('first_name')
  let last_name = get('last_name')
  const full = get('full_name')
  if (full && (!first_name || !last_name)) {
    const split = splitFullName(full)
    if (!first_name) first_name = split.first
    if (!last_name) last_name = split.last
  }

  const name_prefix = get('name_prefix') || undefined
  const parts = [name_prefix, first_name, last_name].filter(Boolean)
  let name = parts.join(' ').trim()
  if (!name && full) name = full.trim()
  if (!name) return null

  const tagsRaw = get('tags')
  const tags_json = tagsRaw
    ? tagsRaw
        .split(/[,;|]/)
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined

  const status = normalizeImportStatus(get('status')) ?? defaults?.status ?? 'lead'

  return {
    name_prefix,
    first_name: first_name || undefined,
    last_name: last_name || undefined,
    name,
    email: get('email') || undefined,
    business_phone: get('business_phone') || undefined,
    cell_phone: get('cell_phone') || undefined,
    phone: get('phone') || undefined,
    company: get('company') || undefined,
    status,
    pipeline_stage: normalizePipelineStage(get('pipeline_stage')) ?? 'new',
    source: get('source') || undefined,
    notes: get('notes') || undefined,
    next_step: get('next_step') || undefined,
    mailing_address_line1: get('mailing_address_line1') || undefined,
    mailing_address_line2: get('mailing_address_line2') || undefined,
    mailing_city: get('mailing_city') || undefined,
    mailing_state: get('mailing_state') || undefined,
    mailing_postal_code: get('mailing_postal_code') || undefined,
    mailing_country: get('mailing_country') || undefined,
    tags_json: tags_json?.length ? tags_json : undefined,
  }
}
