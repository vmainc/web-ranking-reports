import { extractJsonObject } from '~/server/utils/agencyPlannerAI'
import { normalizeProposalDeck, type ProposalDeckPresentation } from '~/lib/proposalDeck'
import type { ProposalEngagementType } from '~/lib/proposalEngagement'
import type { ProposalServicePackage, ProposalServicePackageCategory } from '~/types'

export type { ProposalEngagementType } from '~/lib/proposalEngagement'

export function engagementLabel(t: ProposalEngagementType): string {
  const m: Record<ProposalEngagementType, string> = {
    monthly_marketing: 'Monthly digital marketing retainer',
    website_project: 'Website / one-time build',
    website_plus_retainer: 'Website project + monthly marketing',
    add_on: 'Add-on or single service',
  }
  return m[t]
}

export function categoriesForEngagement(t: ProposalEngagementType): ProposalServicePackageCategory[] {
  switch (t) {
    case 'monthly_marketing':
      return ['monthly_plan']
    case 'website_project':
      return ['one_time_project']
    case 'add_on':
      return ['add_on']
    case 'website_plus_retainer':
      return ['one_time_project', 'monthly_plan']
    default:
      return ['monthly_plan', 'one_time_project', 'add_on']
  }
}

export type ProposalAssistInput = {
  engagement_type: ProposalEngagementType
  client_name: string
  client_location?: string | null
  proposal_title: string
  notes?: string | null
  packages: ProposalServicePackage[]
}

export type ProposalAssistLineItem = {
  sku?: string | null
  name: string
  description: string
  unit_price: number
  billing_interval: 'one_time' | 'month' | 'year' | 'custom'
}

export type ProposalAssistResult = {
  title: string
  intro_html: string
  terms_html: string
  line_items: ProposalAssistLineItem[]
  /** @deprecated use line_items */
  recommended_package_skus: string[]
  deck: ProposalDeckPresentation | null
  rationale: string
}

export function buildProposalAssistSystemPrompt(): string {
  return `You are a senior account strategist at a digital marketing agency (SEO, paid media, tracking, websites).
Help draft client-facing proposal copy and pick SKUs from the agency catalog only — never invent prices or packages not in the list.
Return valid JSON only, no markdown fences:
{
  "title": "short proposal title",
  "intro_html": "2-4 plain-text paragraphs (no HTML tags) tailored to the client; professional, specific, not hypey",
  "terms_html": "short plain-text terms: billing, scope, acceptance, month-to-month or project payment as appropriate",
  "line_items": [
    {
      "sku": "optional-sku-from-catalog-or-null",
      "name": "client-facing service name",
      "description": "scope bullets or short paragraph for this proposal",
      "unit_price": 5000,
      "billing_interval": "one_time"
    }
  ],
  "deck": {
    "layout": "vma_deck",
    "tagline": "WE DON'T SELL TACTICS. WE BUILD ADVANTAGE.",
    "cover": { "pills": ["SEARCH","LOCAL","GROWTH"], "eyebrow": "SEO", "headline": "A STRONGER ONLINE PRESENCE.", "subhead": "...", "practice_line": "WEBSITES · SEARCH · GROWTH", "proposal_type": "SEO Growth Proposal", "package_label": "FOUNDATION SEO", "package_note": "..." },
    "opportunity": { "title": "THE OPPORTUNITY", "intro": "...", "pillars": [{ "title": "...", "body": "..." }] },
    "ninety_days": { "title": "THE FIRST 90 DAYS", "intro": "...", "months": [{ "label": "MONTH 01", "title": "...", "bullets": ["..."] }] },
    "investment": { "title": "FOUNDATION SEO INVESTMENT", "intro": "...", "package_name": "FOUNDATION SEO", "standard_rate": 1650, "standard_rate_label": "Standard monthly rate", "preferred_rate": 500, "preferred_note": "Preferred monthly rate", "bonus_title": "WEBSITE INCLUDED", "bonus_body": "...", "next_steps": "...", "footnote": "..." }
  },
  "rationale": "1-2 sentences for the agency owner (internal tone)"
}
Rules:
- deck is required (vma_deck). Structure is FIXED for every proposal: cover → THE OPPORTUNITY (exactly 4 pillars) → THE FIRST 90 DAYS (exactly 3 months, labels MONTH 01–03) → investment page. Only fill copy and numbers — do not rename sections or change counts.
- Match tone of a premium agency PDF (like VMA): bold ALL-CAPS cover headline, concrete deliverables, preferred vs standard rate when notes mention a discount or included website.
- line_items is required with at least one item. This is the full proposal pricing table.
- When a line is based on a catalog package, set sku and tailor name, description, and unit_price for this client (notes may override catalog default price).
- sku must be from the catalog or null for a fully custom line; never invent skus.
- billing_interval: one_time | month | year | custom — match engagement type (website → one_time, retainer → month).
- For website_plus_retainer, use two line_items when appropriate (project + monthly).
- intro_html should mention outcomes and what happens after acceptance, not internal tooling.`
}

export function buildProposalAssistUserPrompt(input: ProposalAssistInput): string {
  const allowed = input.packages.filter((p) => categoriesForEngagement(input.engagement_type).includes(p.category || 'monthly_plan'))
  const catalog = allowed.map((p) => ({
    sku: p.sku,
    name: p.name,
    category: p.category,
    price: p.default_unit_price,
    billing: p.billing_interval,
    summary: (p.description_html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400),
  }))
  const notes = (input.notes || '').trim()
  return [
    `Engagement type: ${engagementLabel(input.engagement_type)}`,
    `Client: ${input.client_name || 'Prospect'}`,
    input.client_location ? `Location: ${input.client_location}` : '',
    `Working title: ${input.proposal_title || 'Untitled'}`,
    notes ? `Agency notes: ${notes}` : '',
    '',
    'Service catalog (use only these skus):',
    JSON.stringify(catalog, null, 2),
  ]
    .filter(Boolean)
    .join('\n')
}

export function parseProposalAssistJson(rawText: string): ProposalAssistResult {
  const jsonText = extractJsonObject(rawText)
  const parsed = JSON.parse(jsonText) as Partial<ProposalAssistResult>
  const title = String(parsed.title || '').trim()
  const intro_html = String(parsed.intro_html || '').trim()
  const terms_html = String(parsed.terms_html || '').trim()
  const rationale = String(parsed.rationale || '').trim()
  const billingOk = new Set(['one_time', 'month', 'year', 'custom'])
  const rawLines = Array.isArray(parsed.line_items) ? parsed.line_items : []
  const line_items: ProposalAssistLineItem[] = rawLines
    .map((row) => {
      const r = row as Partial<ProposalAssistLineItem>
      const name = String(r.name || '').trim()
      if (!name) return null
      const price = Number(r.unit_price)
      const billing = String(r.billing_interval || 'one_time')
      return {
        sku: r.sku != null && String(r.sku).trim() ? String(r.sku).trim() : null,
        name,
        description: String(r.description || '').trim(),
        unit_price: Number.isFinite(price) && price >= 0 ? price : 0,
        billing_interval: (billingOk.has(billing) ? billing : 'one_time') as ProposalAssistLineItem['billing_interval'],
      }
    })
    .filter((x): x is ProposalAssistLineItem => x != null)

  const skus = Array.isArray(parsed.recommended_package_skus)
    ? parsed.recommended_package_skus.map((s) => String(s).trim()).filter(Boolean)
    : []

  if (!title && !intro_html && !line_items.length && !skus.length) {
    throw new Error('Empty AI response')
  }
  const deck = normalizeProposalDeck((parsed as { deck?: unknown }).deck)

  return {
    title: title || 'Proposal',
    intro_html,
    terms_html,
    line_items,
    recommended_package_skus: skus,
    deck,
    rationale: rationale || 'Review services and pricing before sending.',
  }
}