/**
 * Branded proposal document structure (sections, client details, pricing metadata).
 * Shared by editor, public view, PDF, and server totals.
 */

export const VMA_DEFAULT_MISSION =
  'Our mission is to help businesses make smarter digital decisions by building, optimizing, and connecting the systems that drive real growth. We cut through noise, fix what\'s broken, and turn websites, marketing, and data into clear, measurable advantages.'

export const VMA_DEFAULT_VISION =
  'Our vision is a digital landscape where businesses fully understand their online presence — not as a collection of tools, but as a strategic ecosystem that works together, adapts, and compounds results over time.'

export const VMA_DEFAULT_CLOSING = "We don't sell tactics. We build advantage."

/** Purple → red → orange → gold accent gradient (restrained use in layout). */
export const VMA_GRADIENT_STOPS = ['#6B21A8', '#DC2626', '#EA580C', '#D97706'] as const

export type ProposalSectionKey =
  | 'cover'
  | 'executive_summary'
  | 'goals_challenges'
  | 'strategy_scope'
  | 'deliverables_timeline'
  | 'investment'
  | 'terms_assumptions'
  | 'acceptance'
  | 'closing'
  | 'custom'

export interface ProposalSection {
  id: string
  key: ProposalSectionKey | string
  title: string
  body: string
  hidden: boolean
  sort_order: number
}

export interface ProposalClientDetails {
  client_name: string
  company: string
  contact_name: string
  email: string
  phone: string
  project_title: string
  proposal_date: string
  expiration_date: string
}

export interface ProposalPricingMeta {
  discount_type: 'percent' | 'amount' | null
  discount_value: number
  /** When set, proposal-level discount applies to recurring subtotals too. */
  discount_applies_to: 'one_time' | 'all'
}

export interface ProposalBrandSnapshot {
  mission?: string
  vision?: string
  closing_statement?: string
  gradient?: string[]
}

export interface ProposalContentJson {
  schema_version: 1
  client: ProposalClientDetails
  sections: ProposalSection[]
  pricing: ProposalPricingMeta
  brand?: ProposalBrandSnapshot
  show_closing: boolean
}

export type ProposalLineForTotals = {
  qty: number
  unit_price: number
  billing_interval?: string | null
  metadata_json?: Record<string, unknown> | null
}

export interface ProposalTotalsBreakdown {
  one_time_subtotal: number
  one_time_discount: number
  one_time_total: number
  recurring: Array<{ interval: string; label: string; subtotal: number; discount: number; total: number }>
  grand_total_one_time: number
  currency_note: string
}

const SECTION_DEFAULTS: Array<{ key: ProposalSectionKey; title: string; body?: string }> = [
  { key: 'cover', title: 'Cover', body: '' },
  { key: 'executive_summary', title: 'Executive summary', body: '' },
  { key: 'goals_challenges', title: 'Client goals & current challenges', body: '' },
  { key: 'strategy_scope', title: 'Recommended strategy & scope of work', body: '' },
  { key: 'deliverables_timeline', title: 'Deliverables & timeline', body: '' },
  { key: 'investment', title: 'Investment', body: '' },
  { key: 'terms_assumptions', title: 'Terms & assumptions', body: '' },
  { key: 'acceptance', title: 'Acceptance', body: '' },
  { key: 'closing', title: 'Closing', body: VMA_DEFAULT_CLOSING },
]

export function newSectionId(): string {
  return `sec_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
}

export function defaultProposalBrand(): ProposalBrandSnapshot {
  return {
    mission: VMA_DEFAULT_MISSION,
    vision: VMA_DEFAULT_VISION,
    closing_statement: VMA_DEFAULT_CLOSING,
    gradient: [...VMA_GRADIENT_STOPS],
  }
}

export function defaultProposalSections(brand?: ProposalBrandSnapshot): ProposalSection[] {
  return SECTION_DEFAULTS.map((s, i) => ({
    id: newSectionId(),
    key: s.key,
    title: s.title,
    body:
      s.key === 'closing'
        ? brand?.closing_statement || VMA_DEFAULT_CLOSING
        : s.body || '',
    hidden: s.key === 'cover' ? false : false,
    sort_order: i,
  }))
}

export function defaultClientDetails(): ProposalClientDetails {
  const today = new Date().toISOString().slice(0, 10)
  return {
    client_name: '',
    company: '',
    contact_name: '',
    email: '',
    phone: '',
    project_title: '',
    proposal_date: today,
    expiration_date: '',
  }
}

export function defaultProposalContent(overrides?: Partial<ProposalContentJson>): ProposalContentJson {
  const brand = { ...defaultProposalBrand(), ...overrides?.brand }
  return {
    schema_version: 1,
    client: { ...defaultClientDetails(), ...overrides?.client },
    sections: overrides?.sections?.length ? normalizeSections(overrides.sections) : defaultProposalSections(brand),
    pricing: {
      discount_type: null,
      discount_value: 0,
      discount_applies_to: 'one_time',
      ...overrides?.pricing,
    },
    brand,
    show_closing: overrides?.show_closing !== false,
  }
}

export function normalizeSections(sections: ProposalSection[]): ProposalSection[] {
  return [...sections]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s, i) => ({
      id: s.id || newSectionId(),
      key: s.key || 'custom',
      title: String(s.title || 'Section').trim() || 'Section',
      body: String(s.body ?? ''),
      hidden: !!s.hidden,
      sort_order: i,
    }))
}

export function normalizeProposalContent(raw: unknown): ProposalContentJson {
  if (!raw || typeof raw !== 'object') return defaultProposalContent()
  const o = raw as Partial<ProposalContentJson>
  const brand = { ...defaultProposalBrand(), ...(o.brand || {}) }
  const sections =
    Array.isArray(o.sections) && o.sections.length
      ? normalizeSections(o.sections as ProposalSection[])
      : defaultProposalSections(brand)
  return {
    schema_version: 1,
    client: { ...defaultClientDetails(), ...(o.client || {}) },
    sections,
    pricing: {
      discount_type: o.pricing?.discount_type === 'percent' || o.pricing?.discount_type === 'amount' ? o.pricing.discount_type : null,
      discount_value: Math.max(0, Number(o.pricing?.discount_value) || 0),
      discount_applies_to: o.pricing?.discount_applies_to === 'all' ? 'all' : 'one_time',
    },
    brand,
    show_closing: o.show_closing !== false,
  }
}

/** Map legacy intro_html / terms_html into structured content when content_json is empty. */
export function mergeLegacyProposalFields(
  content: ProposalContentJson,
  intro_html?: string | null,
  terms_html?: string | null,
): ProposalContentJson {
  const next = normalizeProposalContent(content)
  const intro = (intro_html || '').trim()
  const terms = (terms_html || '').trim()
  if (intro) {
    const exec = next.sections.find((s) => s.key === 'executive_summary')
    if (exec && !exec.body.trim()) exec.body = intro
  }
  if (terms) {
    const termsSec = next.sections.find((s) => s.key === 'terms_assumptions')
    if (termsSec && !termsSec.body.trim()) termsSec.body = terms
  }
  return next
}

export function lineExtension(line: ProposalLineForTotals): number {
  const qty = Math.max(0, Number(line.qty) || 0)
  const price = Number(line.unit_price) || 0
  const meta = line.metadata_json || {}
  const pct = Math.min(100, Math.max(0, Number(meta.discount_percent) || 0))
  const optional = meta.optional === true
  if (optional && qty === 0) return 0
  const base = qty * price
  return base * (1 - pct / 100)
}

export function isOptionalLine(line: ProposalLineForTotals): boolean {
  return line.metadata_json?.optional === true
}

export function billingIntervalLabel(interval: string): string {
  if (interval === 'month') return 'Monthly'
  if (interval === 'year') return 'Annual'
  if (interval === 'custom') return 'Recurring (custom)'
  return 'One-time'
}

function applyProposalDiscount(subtotal: number, pricing: ProposalPricingMeta, applies: boolean): { discount: number; total: number } {
  if (!applies || subtotal <= 0 || !pricing.discount_type || pricing.discount_value <= 0) {
    return { discount: 0, total: subtotal }
  }
  let discount = 0
  if (pricing.discount_type === 'percent') {
    discount = subtotal * (Math.min(100, pricing.discount_value) / 100)
  } else {
    discount = Math.min(subtotal, pricing.discount_value)
  }
  return { discount, total: Math.max(0, subtotal - discount) }
}

export function calcProposalTotals(
  lines: ProposalLineForTotals[],
  pricing: ProposalPricingMeta,
): ProposalTotalsBreakdown {
  const oneTimeLines = lines.filter((l) => !l.billing_interval || l.billing_interval === 'one_time')
  const recurringLines = lines.filter((l) => l.billing_interval && l.billing_interval !== 'one_time')

  const one_time_subtotal = oneTimeLines.reduce((s, l) => s + lineExtension(l), 0)
  const oneTimeDisc = applyProposalDiscount(one_time_subtotal, pricing, true)
  const recurringMap = new Map<string, number>()
  for (const l of recurringLines) {
    const key = l.billing_interval || 'custom'
    recurringMap.set(key, (recurringMap.get(key) || 0) + lineExtension(l))
  }
  const recurring: ProposalTotalsBreakdown['recurring'] = []
  for (const [interval, subtotal] of recurringMap.entries()) {
    const applies = pricing.discount_applies_to === 'all'
    const d = applyProposalDiscount(subtotal, pricing, applies)
    recurring.push({
      interval,
      label: billingIntervalLabel(interval),
      subtotal,
      discount: d.discount,
      total: d.total,
    })
  }
  recurring.sort((a, b) => a.label.localeCompare(b.label))

  return {
    one_time_subtotal,
    one_time_discount: oneTimeDisc.discount,
    one_time_total: oneTimeDisc.total,
    recurring,
    grand_total_one_time: oneTimeDisc.total,
    currency_note: 'One-time and recurring charges are billed separately.',
  }
}

/** Stored proposal.total: one-time total after discounts (recurring shown separately). */
export function calcStoredProposalTotal(lines: ProposalLineForTotals[], pricing: ProposalPricingMeta): number {
  return calcProposalTotals(lines, pricing).one_time_total
}

export function visibleSections(content: ProposalContentJson): ProposalSection[] {
  return normalizeSections(content.sections).filter((s) => !s.hidden && s.key !== 'cover')
}

export function seedClientFromCrm(client: {
  name?: string
  company?: string
  email?: string
  phone?: string
  cell_phone?: string
  business_phone?: string
}): Partial<ProposalClientDetails> {
  return {
    client_name: client.company?.trim() || client.name?.trim() || '',
    company: client.company?.trim() || '',
    contact_name: client.name?.trim() || '',
    email: client.email?.trim() || '',
    phone: client.cell_phone?.trim() || client.business_phone?.trim() || client.phone?.trim() || '',
  }
}
