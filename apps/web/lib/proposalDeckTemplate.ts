import {
  VMA_DECK_TAGLINE,
  type ProposalDeckPresentation,
  type ProposalDeckPillar,
  type ProposalDeckMonth,
} from '~/lib/proposalDeck'
import type { ProposalEngagementType } from '~/server/utils/proposalAssistAI'

/** Locked VMA deck structure — same every proposal; only copy and numbers change. */
export const DECK_FIXED = {
  layout: 'vma_deck' as const,
  tagline: VMA_DECK_TAGLINE,
  practiceLine: 'WEBSITES · SEARCH · GROWTH',
  opportunityTitle: 'THE OPPORTUNITY',
  ninetyDaysTitle: 'THE FIRST 90 DAYS',
  monthLabels: ['MONTH 01', 'MONTH 02', 'MONTH 03'] as const,
  pillarCount: 4,
  monthCount: 3,
}

const ENGAGEMENT_DEFAULTS: Record<
  ProposalEngagementType,
  { pills: string[]; eyebrow: string; defaultHeadline: string; investmentTitle: string }
> = {
  monthly_marketing: {
    pills: ['SEARCH', 'LOCAL', 'GROWTH'],
    eyebrow: 'SEO',
    defaultHeadline: 'A STRONGER ONLINE PRESENCE.',
    investmentTitle: 'MONTHLY GROWTH INVESTMENT',
  },
  website_project: {
    pills: ['WEBSITES', 'CONVERSION', 'GROWTH'],
    eyebrow: 'WEB',
    defaultHeadline: 'A WEBSITE BUILT TO CONVERT.',
    investmentTitle: 'WEBSITE PROJECT INVESTMENT',
  },
  website_plus_retainer: {
    pills: ['WEBSITES', 'SEARCH', 'GROWTH'],
    eyebrow: 'WEB + SEO',
    defaultHeadline: 'WEBSITE & ONGOING GROWTH.',
    investmentTitle: 'WEBSITE + RETAINER INVESTMENT',
  },
  add_on: {
    pills: ['SEARCH', 'LOCAL', 'GROWTH'],
    eyebrow: 'SERVICES',
    defaultHeadline: 'TARGETED DIGITAL SERVICES.',
    investmentTitle: 'PROJECT INVESTMENT',
  },
}

const DEFAULT_MONTHS: ProposalDeckMonth[] = [
  {
    label: 'MONTH 01',
    title: 'Foundation & discovery',
    bullets: ['Review site and goals', 'Baseline analytics and search', 'Prioritize quick wins'],
  },
  {
    label: 'MONTH 02',
    title: 'Build & optimize',
    bullets: ['Execute core deliverables', 'Improve key pages', 'Strengthen tracking'],
  },
  {
    label: 'MONTH 03',
    title: 'Launch & grow',
    bullets: ['Validate results', 'Refine based on data', 'Set next priorities'],
  },
]

function padPillars(pillars: ProposalDeckPillar[]): ProposalDeckPillar[] {
  const out = pillars.filter((p) => p.title?.trim()).slice(0, DECK_FIXED.pillarCount)
  while (out.length < DECK_FIXED.pillarCount) {
    out.push({
      title: `Deliverable ${out.length + 1}`,
      body: 'Scope details will be finalized at kickoff.',
    })
  }
  return out
}

function padMonths(months: ProposalDeckMonth[]): ProposalDeckMonth[] {
  const out = months.filter((m) => m.title?.trim()).slice(0, DECK_FIXED.monthCount)
  while (out.length < DECK_FIXED.monthCount) {
    const i = out.length
    const def = DEFAULT_MONTHS[i] || DEFAULT_MONTHS[0]
    out.push({
      label: DECK_FIXED.monthLabels[i] || `MONTH ${String(i + 1).padStart(2, '0')}`,
      title: def.title,
      bullets: [...def.bullets],
    })
  }
  for (let i = 0; i < out.length; i++) {
    out[i] = {
      ...out[i],
      label: DECK_FIXED.monthLabels[i],
      bullets: (out[i].bullets || []).filter(Boolean).slice(0, 8),
    }
  }
  return out
}

/** Enforce consistent deck structure for every agency proposal. */
export function finalizeDeckForEngagement(
  deck: ProposalDeckPresentation,
  engagementType: ProposalEngagementType,
  clientName?: string | null,
): ProposalDeckPresentation {
  const defs = ENGAGEMENT_DEFAULTS[engagementType]
  const headline = (deck.cover.headline || defs.defaultHeadline).trim().toUpperCase()
  return {
    layout: 'vma_deck',
    tagline: DECK_FIXED.tagline,
    cover: {
      pills: defs.pills,
      eyebrow: deck.cover.eyebrow?.trim() || defs.eyebrow,
      headline,
      subhead: deck.cover.subhead?.trim() || '',
      practice_line: DECK_FIXED.practiceLine,
      proposal_type: deck.cover.proposal_type?.trim() || `${clientName || 'Client'} proposal`,
      package_label: deck.cover.package_label?.trim() || deck.investment.package_name?.toUpperCase() || '',
      package_note: deck.cover.package_note?.trim() || '',
    },
    opportunity: {
      title: DECK_FIXED.opportunityTitle,
      intro: deck.opportunity.intro?.trim() || '',
      pillars: padPillars(deck.opportunity.pillars || []),
    },
    ninety_days: {
      title: DECK_FIXED.ninetyDaysTitle,
      intro:
        deck.ninety_days.intro?.trim() ||
        'We prioritize the work that matters most based on your site, search presence, and goals.',
      months: padMonths(deck.ninety_days.months || []),
    },
    investment: {
      ...deck.investment,
      title: deck.investment.title?.trim() || defs.investmentTitle,
    },
  }
}