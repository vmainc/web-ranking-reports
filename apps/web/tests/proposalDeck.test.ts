import { describe, expect, it } from 'vitest'
import { buildProposalDeckFallback, normalizeProposalDeck } from '~/lib/proposalDeck'

describe('proposalDeck', () => {
  it('builds fallback vma deck', () => {
    const deck = buildProposalDeckFallback({
      title: 'SEO Growth',
      intro_html: 'Help patients find the clinic.',
      client_name: 'Downtown Chiropractic',
      client_location: 'Kansas City, MO',
      currency: 'USD',
      items: [{ name: 'Foundation SEO', unit_price: 500, billing_interval: 'month', description: 'Monthly SEO' }],
    })
    expect(deck.layout).toBe('vma_deck')
    expect(deck.cover.headline).toBeTruthy()
    expect(deck.investment.preferred_rate).toBe(500)
  })

  it('normalizes vma deck', () => {
    const deck = normalizeProposalDeck({
      layout: 'vma_deck',
      cover: { headline: 'TEST', pills: ['A'] },
      opportunity: { pillars: [{ title: 'P', body: 'B' }] },
    })
    expect(deck?.cover.headline).toBe('TEST')
  })
})