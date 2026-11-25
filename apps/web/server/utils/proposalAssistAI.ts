import { extractJsonObject } from '~/server/utils/agencyPlannerAI'
import type { ProposalServicePackage, ProposalServicePackageCategory } from '~/types'

export type ProposalEngagementType =
  | 'monthly_marketing'
  | 'website_project'
  | 'website_plus_retainer'
  | 'add_on'

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
  proposal_title: string
  notes?: string | null
  packages: ProposalServicePackage[]
}

export type ProposalAssistResult = {
  title: string
  intro_html: string
  terms_html: string
  recommended_package_skus: string[]
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
  "recommended_package_skus": ["sku-from-list"],
  "rationale": "1-2 sentences for the agency owner (internal tone)"
}
Rules:
- recommended_package_skus must use only sku values from the provided catalog.
- For website_plus_retainer, include one website/project sku and one monthly_plan sku when appropriate.
- For monthly_marketing, prefer a single monthly plan unless notes justify two lines.
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
  const skus = Array.isArray(parsed.recommended_package_skus)
    ? parsed.recommended_package_skus.map((s) => String(s).trim()).filter(Boolean)
    : []
  if (!title && !intro_html && !skus.length) {
    throw new Error('Empty AI response')
  }
  return {
    title: title || 'Proposal',
    intro_html,
    terms_html,
    recommended_package_skus: skus,
    rationale: rationale || 'Review recommended packages before sending.',
  }
}