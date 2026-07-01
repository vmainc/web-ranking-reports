import type { ClaudeConfig } from '~/server/utils/claude'
import { claudeTextCompletion, extractJsonObject } from '~/server/utils/contentGeneratorAi'
import {
  CRM_IMPORT_FIELD_IDS,
  type CrmColumnMapping,
  type CrmImportFieldId,
} from '~/lib/crmImportExport'

export interface CrmImportAnalyzeResult {
  mapping: CrmColumnMapping
  notes?: string
  usedAi: boolean
}

const HEADER_ALIASES: Record<CrmImportFieldId, string[]> = {
  name_prefix: ['prefix', 'salutation', 'title', 'mr', 'ms'],
  first_name: ['first name', 'firstname', 'first', 'given name', 'givenname'],
  last_name: ['last name', 'lastname', 'last', 'surname', 'family name'],
  full_name: ['full name', 'fullname', 'name', 'contact name', 'client name', 'customer name'],
  email: ['email', 'e-mail', 'email address', 'work email'],
  business_phone: ['business phone', 'work phone', 'office phone', 'company phone', 'phone work'],
  cell_phone: ['cell phone', 'cell', 'mobile', 'mobile phone', 'phone mobile'],
  phone: ['phone', 'telephone', 'tel', 'phone number'],
  company: ['company', 'organization', 'organisation', 'business', 'account', 'account name'],
  status: ['status', 'type', 'contact type', 'lead status'],
  pipeline_stage: ['pipeline', 'pipeline stage', 'stage', 'deal stage'],
  source: ['source', 'lead source', 'origin', 'referral'],
  notes: ['notes', 'note', 'comments', 'comment', 'description'],
  next_step: ['next step', 'next action', 'follow up', 'follow-up'],
  mailing_address_line1: ['address', 'address 1', 'address line 1', 'street', 'street address', 'mailing address'],
  mailing_address_line2: ['address 2', 'address line 2', 'suite', 'apt', 'unit'],
  mailing_city: ['city', 'town', 'mailing city'],
  mailing_state: ['state', 'province', 'region', 'mailing state'],
  mailing_postal_code: ['zip', 'zip code', 'postal', 'postal code', 'postcode'],
  mailing_country: ['country', 'nation'],
  tags: ['tags', 'labels', 'categories'],
}

function normHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Rule-based column matching when Claude is unavailable. */
export function heuristicColumnMapping(headers: string[]): CrmColumnMapping {
  const mapping: CrmColumnMapping = {}
  const usedHeaders = new Set<string>()

  for (const fieldId of CRM_IMPORT_FIELD_IDS) {
    const aliases = HEADER_ALIASES[fieldId] ?? []
    let best: string | null = null
    for (const header of headers) {
      if (usedHeaders.has(header)) continue
      const n = normHeader(header)
      if (aliases.some((a) => n === a || n.includes(a) || a.includes(n))) {
        best = header
        break
      }
    }
    if (best) {
      mapping[fieldId] = best
      usedHeaders.add(best)
    }
  }

  // Prefer first_name/last_name over full_name when both could match "name"
  if (mapping.first_name && mapping.full_name === mapping.first_name) {
    delete mapping.full_name
  }
  if (mapping.last_name && mapping.full_name === mapping.last_name) {
    delete mapping.full_name
  }

  return mapping
}

export async function analyzeCrmImportColumns(
  config: ClaudeConfig | null,
  params: { headers: string[]; sampleRows: Record<string, string>[] },
): Promise<CrmImportAnalyzeResult> {
  const { headers, sampleRows } = params
  if (!headers.length) {
    return { mapping: {}, usedAi: false, notes: 'No columns found in file.' }
  }

  if (!config) {
    return {
      mapping: heuristicColumnMapping(headers),
      usedAi: false,
      notes: 'Claude is not configured; used automatic column matching. You can adjust mappings below.',
    }
  }

  const fieldList = CRM_IMPORT_FIELD_IDS.map((id) => id).join(', ')
  const sampleJson = JSON.stringify(sampleRows.slice(0, 6), null, 0)

  const user = `You map spreadsheet columns to CRM contact fields.

Target field ids (use only these as keys in "mapping"; value is the exact source column header from the file, or null if no match):
${fieldList}

Rules:
- "full_name" is for a single Name column when first/last are not separate.
- Do not map the same source column to more than one target field.
- Prefer "first_name" and "last_name" when the file has separate columns.
- "status" values in data may be Lead/Customer/Client/etc.; we normalize on import.
- Return ONLY valid JSON, no markdown.

Source columns: ${JSON.stringify(headers)}

Sample rows (first rows of data):
${sampleJson}

Respond with JSON:
{
  "mapping": { "first_name": "Exact Header From File or null", ... },
  "notes": "Brief note for the user about any ambiguous columns"
}`

  try {
    const raw = await claudeTextCompletion(config, {
      max_tokens: 1200,
      temperature: 0.1,
      system:
        'You are a data import assistant. Output only JSON matching the requested schema. Use exact header strings from the source file as mapping values.',
      user,
    })
    const parsed = JSON.parse(extractJsonObject(raw)) as {
      mapping?: Record<string, string | null>
      notes?: string
    }
    const mapping: CrmColumnMapping = {}
    for (const id of CRM_IMPORT_FIELD_IDS) {
      const v = parsed.mapping?.[id]
      if (typeof v === 'string' && v.trim() && headers.includes(v)) {
        mapping[id] = v
      } else {
        mapping[id] = null
      }
    }
    return {
      mapping,
      notes: typeof parsed.notes === 'string' ? parsed.notes : undefined,
      usedAi: true,
    }
  } catch (e) {
    console.error('[crm-import] Claude mapping failed', e)
    return {
      mapping: heuristicColumnMapping(headers),
      usedAi: false,
      notes: 'AI column matching failed; using automatic matching. Adjust mappings if needed.',
    }
  }
}
