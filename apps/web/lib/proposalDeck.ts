import { VMA_DECK_TAGLINE } from '~/lib/proposalDeckConstants'

export { VMA_DECK_TAGLINE }

export type ProposalDeckMonth = {
  label: string
  title: string
  bullets: string[]
}

export type ProposalDeckPillar = {
  title: string
  body: string
}

export type ProposalDeckCover = {
  pills: string[]
  eyebrow: string
  headline: string
  subhead: string
  practice_line: string
  proposal_type: string
  package_label: string
  package_note: string
}

export type ProposalDeckOpportunity = {
  title: string
  intro: string
  pillars: ProposalDeckPillar[]
}

export type ProposalDeckNinetyDays = {
  title: string
  intro: string
  months: ProposalDeckMonth[]
}

export type ProposalDeckInvestment = {
  title: string
  intro: string
  package_name: string
  standard_rate: number | null
  standard_rate_label: string
  preferred_rate: number | null
  preferred_note: string
  bonus_title: string
  bonus_body: string
  next_steps: string
  footnote: string
}

export type ProposalDeckPresentation = {
  layout: 'vma_deck'
  tagline: string
  cover: ProposalDeckCover
  opportunity: ProposalDeckOpportunity
  ninety_days: ProposalDeckNinetyDays
  investment: ProposalDeckInvestment
}

import { DECK_FIXED } from '~/lib/proposalDeckTemplate'

export function normalizeProposalDeck(raw: unknown): ProposalDeckPresentation | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.layout !== 'vma_deck') return null
  const cover = o.cover as ProposalDeckCover | undefined
  const opportunity = o.opportunity as ProposalDeckOpportunity | undefined
  const ninety_days = o.ninety_days as ProposalDeckNinetyDays | undefined
  const investment = o.investment as ProposalDeckInvestment | undefined
  if (!cover?.headline || !opportunity) return null
  return {
    layout: 'vma_deck',
    tagline: DECK_FIXED.tagline,
    cover: {
      pills: Array.isArray(cover.pills) ? cover.pills.map(String).slice(0, 3) : ['SEARCH', 'LOCAL', 'GROWTH'],
      eyebrow: String(cover.eyebrow || 'SEO'),
      headline: String(cover.headline),
      subhead: String(cover.subhead || ''),
      practice_line: DECK_FIXED.practiceLine,
      proposal_type: String(cover.proposal_type || 'Growth Proposal'),
      package_label: String(cover.package_label || ''),
      package_note: String(cover.package_note || ''),
    },
    opportunity: {
      title: DECK_FIXED.opportunityTitle,
      intro: String(opportunity.intro || ''),
      pillars: Array.isArray(opportunity.pillars)
        ? opportunity.pillars
            .map((p) => ({
              title: String((p as ProposalDeckPillar).title || ''),
              body: String((p as ProposalDeckPillar).body || ''),
            }))
            .filter((p) => p.title)
            .slice(0, 8)
        : [],
    },
    ninety_days: {
      title: DECK_FIXED.ninetyDaysTitle,
      intro: String(ninety_days?.intro || ''),
      months: Array.isArray(ninety_days?.months)
        ? ninety_days!.months
            .map((m, i) => ({
              label: String((m as ProposalDeckMonth).label || `MONTH ${String(i + 1).padStart(2, '0')}`),
              title: String((m as ProposalDeckMonth).title || ''),
              bullets: Array.isArray((m as ProposalDeckMonth).bullets)
                ? (m as ProposalDeckMonth).bullets.map(String).filter(Boolean).slice(0, 8)
                : [],
            }))
            .filter((m) => m.title)
            .slice(0, 3)
        : [],
    },
    investment: {
      title: String(investment?.title || 'INVESTMENT'),
      intro: String(investment?.intro || ''),
      package_name: String(investment?.package_name || ''),
      standard_rate:
        investment?.standard_rate != null && Number.isFinite(Number(investment.standard_rate))
          ? Number(investment.standard_rate)
          : null,
      standard_rate_label: String(investment?.standard_rate_label || 'Standard monthly rate'),
      preferred_rate:
        investment?.preferred_rate != null && Number.isFinite(Number(investment.preferred_rate))
          ? Number(investment.preferred_rate)
          : null,
      preferred_note: String(investment?.preferred_note || 'Preferred monthly rate'),
      bonus_title: String(investment?.bonus_title || ''),
      bonus_body: String(investment?.bonus_body || ''),
      next_steps: String(investment?.next_steps || ''),
      footnote: String(investment?.footnote || ''),
    },
  }
}

type DeckFallbackInput = {
  title: string
  intro_html?: string | null
  client_name?: string | null
  client_location?: string | null
  currency: string
  items: Array<{
    name: string
    description?: string | null
    unit_price: number
    billing_interval?: string | null
  }>
}

export function buildProposalDeckFallback(input: DeckFallbackInput): ProposalDeckPresentation {
  const intro = (input.intro_html || '').trim()
  const introFirst = intro.split(/\n\n+/)[0] || intro
  const primary = input.items[0]
  const monthly = input.items.find((i) => i.billing_interval === 'month') || primary
  const preferred = monthly ? Number(monthly.unit_price) : input.items.reduce((s, i) => s + Number(i.unit_price), 0)
  const pillars =
    input.items.length > 0
      ? input.items.slice(0, 4).map((it) => ({
          title: it.name,
          body: (it.description || '').trim() || 'Scope and deliverables as outlined in this proposal.',
        }))
      : [{ title: 'Strategic partnership', body: introFirst || 'Custom scope tailored to your business goals.' }]

  return {
    layout: 'vma_deck',
    tagline: VMA_DECK_TAGLINE,
    cover: {
      pills: ['SEARCH', 'LOCAL', 'GROWTH'],
      eyebrow: input.title.split(/\s+/)[0]?.toUpperCase() || 'GROWTH',
      headline: input.title.toUpperCase(),
      subhead: introFirst.slice(0, 280),
      practice_line: 'WEBSITES · SEARCH · GROWTH',
      proposal_type: input.title,
      package_label: primary?.name?.toUpperCase() || 'SERVICES',
      package_note: primary?.description?.split('\n')[0]?.slice(0, 120) || '',
    },
    opportunity: {
      title: 'THE OPPORTUNITY',
      intro: introFirst || 'A clear plan to improve visibility, credibility, and leads.',
      pillars,
    },
    ninety_days: {
      title: 'THE FIRST 90 DAYS',
      intro: 'We prioritize the work that matters most based on your site, search presence, and goals.',
      months: [
        {
          label: 'MONTH 01',
          title: 'Foundation & discovery',
          bullets: ['Review site and analytics baseline', 'Confirm goals and tracking', 'Prioritize quick wins'],
        },
        {
          label: 'MONTH 02',
          title: 'Build & optimize',
          bullets: ['Execute core scope items', 'Improve key pages and metadata', 'Strengthen local signals'],
        },
        {
          label: 'MONTH 03',
          title: 'Launch & iterate',
          bullets: ['Validate tracking and indexing', 'Refine based on early data', 'Set next monthly priorities'],
        },
      ],
    },
    investment: {
      title: 'INVESTMENT',
      intro: monthly ? 'Ongoing partnership pricing.' : 'Project investment.',
      package_name: monthly?.name || primary?.name || 'Services',
      standard_rate: null,
      standard_rate_label: 'List rate',
      preferred_rate: preferred,
      preferred_note: monthly ? 'Monthly investment' : 'One-time investment',
      bonus_title: '',
      bonus_body: input.items[1]?.description?.slice(0, 200) || '',
      next_steps: 'Approve this proposal and we will confirm access, kickoff, and timeline.',
      footnote: (input.items.map((i) => i.description).filter(Boolean).join(' ') || '').slice(0, 400),
    },
  }
}