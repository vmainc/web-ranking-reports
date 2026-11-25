<template>
  <article class="vma-deck" :style="cssVars">
  <section class="vma-deck__page vma-deck__cover">
    <header class="vma-deck__top">
      <div class="vma-deck__pills">{{ deck.cover.pills.join(' / ') }}</div>
      <img v-if="logoUrl" :src="logoUrl" alt="" class="vma-deck__logo" />
    </header>
    <p class="vma-deck__eyebrow">{{ deck.cover.eyebrow }}</p>
    <h1 class="vma-deck__headline">{{ deck.cover.headline }}</h1>
    <p v-if="deck.cover.subhead" class="vma-deck__subhead">{{ deck.cover.subhead }}</p>
    <p class="vma-deck__practice">{{ deck.cover.practice_line }}</p>
    <div class="vma-deck__cover-card">
      <p class="vma-deck__proposal-type">{{ deck.cover.proposal_type }}</p>
      <p class="vma-deck__prepared">PREPARED EXCLUSIVELY FOR</p>
      <p class="vma-deck__client">{{ clientName || 'Client' }}</p>
      <p v-if="clientLocation" class="vma-deck__location">{{ clientLocation }}</p>
      <p class="vma-deck__date">{{ formattedDate }}</p>
      <p v-if="deck.cover.package_label" class="vma-deck__package-label">{{ deck.cover.package_label }}</p>
      <p v-if="deck.cover.package_note" class="vma-deck__package-note">{{ deck.cover.package_note }}</p>
    </div>
    <footer class="vma-deck__foot">{{ deck.tagline }}</footer>
  </section>

  <section class="vma-deck__page vma-deck__light">
    <p class="vma-deck__section-kicker">{{ deck.opportunity.title }}</p>
    <h2 class="vma-deck__section-title">{{ opportunityHeadline }}</h2>
    <p v-if="deck.opportunity.intro" class="vma-deck__lead">{{ deck.opportunity.intro }}</p>
    <div class="vma-deck__pillars">
      <div v-for="(pillar, i) in deck.opportunity.pillars" :key="i" class="vma-deck__pillar">
        <h3>{{ pillar.title }}</h3>
        <p>{{ pillar.body }}</p>
      </div>
    </div>
    <footer class="vma-deck__foot vma-deck__foot--dark">02 · {{ deck.tagline }}</footer>
  </section>

  <section v-if="deck.ninety_days.months.length" class="vma-deck__page vma-deck__light">
    <p class="vma-deck__section-kicker">{{ deck.ninety_days.title }}</p>
    <h2 class="vma-deck__section-title">{{ ninetyHeadline }}</h2>
    <p v-if="deck.ninety_days.intro" class="vma-deck__lead">{{ deck.ninety_days.intro }}</p>
    <div class="vma-deck__months">
      <div v-for="(month, i) in deck.ninety_days.months" :key="i" class="vma-deck__month">
        <p class="vma-deck__month-label">{{ month.label }}</p>
        <h3>{{ month.title }}</h3>
        <ul>
          <li v-for="(b, j) in month.bullets" :key="j">{{ b }}</li>
        </ul>
      </div>
    </div>
    <footer class="vma-deck__foot vma-deck__foot--dark">03 · {{ deck.tagline }}</footer>
  </section>

  <section class="vma-deck__page vma-deck__investment">
    <p class="vma-deck__section-kicker">{{ deck.investment.title }}</p>
    <h2 class="vma-deck__section-title vma-deck__section-title--light">{{ investmentHeadline }}</h2>
    <p v-if="deck.investment.intro" class="vma-deck__lead vma-deck__lead--light">{{ deck.investment.intro }}</p>
    <div class="vma-deck__pricing">
      <div class="vma-deck__price-card">
        <p class="vma-deck__price-name">{{ deck.investment.package_name }}</p>
        <p v-if="deck.investment.standard_rate != null" class="vma-deck__price-line vma-deck__price-line--muted">
          {{ deck.investment.standard_rate_label }}
          <strong>{{ money(deck.investment.standard_rate) }}</strong>
          <span v-if="isMonthly"> / month</span>
        </p>
        <p v-if="deck.investment.preferred_rate != null" class="vma-deck__price-line vma-deck__price-preferred">
          {{ deck.investment.preferred_note.toUpperCase() }}
          <strong>{{ money(deck.investment.preferred_rate) }}</strong>
          <span v-if="isMonthly"> / month</span>
        </p>
        <p v-if="savingsText" class="vma-deck__savings">{{ savingsText }}</p>
      </div>
      <div v-if="deck.investment.bonus_title || deck.investment.bonus_body" class="vma-deck__bonus">
        <p class="vma-deck__bonus-title">{{ deck.investment.bonus_title || 'INCLUDED' }}</p>
        <p>{{ deck.investment.bonus_body }}</p>
      </div>
    </div>
    <div v-if="deck.investment.next_steps" class="vma-deck__next">
      <p class="vma-deck__next-label">NEXT STEPS</p>
      <p>{{ deck.investment.next_steps }}</p>
    </div>
    <p v-if="deck.investment.footnote" class="vma-deck__footnote">{{ deck.investment.footnote }}</p>
    <footer class="vma-deck__foot">04 · {{ deck.tagline }}</footer>
  </section>
  </article>
</template>

<script setup lang="ts">
import type { ProposalDeckPresentation } from '~/lib/proposalDeck'

const props = defineProps<{
  deck: ProposalDeckPresentation
  clientName?: string | null
  clientLocation?: string | null
  proposalDate?: string | null
  currency?: string
  logoUrl?: string | null
  colors?: { primary?: string; accent?: string; text?: string; surface?: string }
}>()

const cssVars = computed(() => ({
  '--vma-primary': props.colors?.primary || '#1e3a5f',
  '--vma-accent': props.colors?.accent || '#3b82f6',
  '--vma-text': props.colors?.text || '#0f172a',
  '--vma-surface': props.colors?.surface || '#f8fafc',
}))

const opportunityHeadline = computed(() => {
  const t = props.deck.opportunity.intro || ''
  const first = t.split(/[.!?]/)[0]
  return first ? `${first}.` : 'A stronger digital presence.'
})

const ninetyHeadline = computed(() => 'A practical plan for steady improvement.')

const investmentHeadline = computed(() => {
  const intro = props.deck.investment.intro || ''
  return intro.split(/[.!?]/)[0] || props.deck.investment.package_name
})

const isMonthly = computed(() => {
  const note = (props.deck.investment.preferred_note || '').toLowerCase()
  const label = (props.deck.investment.standard_rate_label || '').toLowerCase()
  return note.includes('month') || label.includes('month')
})

const savingsText = computed(() => {
  const std = props.deck.investment.standard_rate
  const pref = props.deck.investment.preferred_rate
  if (std == null || pref == null || pref >= std) return ''
  const diff = std - pref
  return `${money(diff)}/month savings`
})

const formattedDate = computed(() => {
  const raw = props.proposalDate
  if (!raw) {
    try {
      return new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    } catch {
      return ''
    }
  }
  try {
    return new Date(raw).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return raw
  }
})

function money(n: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: props.currency || 'USD',
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `$${Math.round(n)}`
  }
}
</script>

<style scoped>
.vma-deck {
  --vma-primary: #1e3a5f;
  --vma-accent: #3b82f6;
  --vma-text: #0f172a;
  --vma-surface: #f8fafc;
  font-family: 'Helvetica Neue', Arial, system-ui, sans-serif;
  color: var(--vma-text);
  max-width: 52rem;
  margin: 0 auto;
}
.vma-deck__page {
  position: relative;
  min-height: 32rem;
  padding: 2.5rem 2rem 3.5rem;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
.vma-deck__cover {
  background: linear-gradient(165deg, #0b1220 0%, var(--vma-primary) 55%, #1a2744 100%);
  color: #f8fafc;
}
.vma-deck__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
}
.vma-deck__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  font-weight: 600;
  text-transform: uppercase;
  color: color-mix(in srgb, white 75%, var(--vma-accent));
}
.vma-deck__logo {
  height: 2.5rem;
  width: auto;
  max-width: 10rem;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: 0.95;
}
.vma-deck__eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--vma-accent);
  margin: 0 0 0.5rem;
}
.vma-deck__headline {
  font-size: clamp(2rem, 6vw, 3.25rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin: 0 0 1rem;
  text-transform: uppercase;
  max-width: 16ch;
}
.vma-deck__subhead {
  font-size: 1.05rem;
  line-height: 1.55;
  max-width: 36ch;
  color: color-mix(in srgb, white 88%, transparent);
  margin: 0 0 1.25rem;
}
.vma-deck__practice {
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.65;
  margin: 0 0 2rem;
}
.vma-deck__cover-card {
  margin-top: auto;
  border-top: 1px solid color-mix(in srgb, white 18%, transparent);
  padding-top: 1.5rem;
}
.vma-deck__proposal-type {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0 0 1rem;
}
.vma-deck__prepared {
  font-size: 0.65rem;
  letter-spacing: 0.16em;
  opacity: 0.7;
  margin: 0 0 0.35rem;
}
.vma-deck__client {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}
.vma-deck__location,
.vma-deck__date {
  font-size: 0.95rem;
  opacity: 0.85;
  margin: 0.35rem 0 0;
}
.vma-deck__package-label {
  margin: 1.25rem 0 0.25rem;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
}
.vma-deck__package-note {
  font-size: 0.9rem;
  opacity: 0.85;
  margin: 0;
}
.vma-deck__light {
  background: var(--vma-surface);
}
.vma-deck__section-kicker {
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: var(--vma-accent);
  margin: 0 0 0.35rem;
}
.vma-deck__section-title {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0 0 1rem;
  line-height: 1.15;
}
.vma-deck__section-title--light {
  color: #f8fafc;
}
.vma-deck__lead {
  font-size: 1rem;
  line-height: 1.6;
  max-width: 42rem;
  margin: 0 0 1.75rem;
  color: color-mix(in srgb, var(--vma-text) 80%, transparent);
}
.vma-deck__lead--light {
  color: color-mix(in srgb, white 88%, transparent);
}
.vma-deck__pillars {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.vma-deck__pillar h3 {
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 0.5rem;
}
.vma-deck__pillar p {
  font-size: 0.9rem;
  line-height: 1.55;
  margin: 0;
  color: color-mix(in srgb, var(--vma-text) 75%, transparent);
}
.vma-deck__months {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
.vma-deck__month-label {
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  font-weight: 700;
  color: var(--vma-accent);
  margin: 0 0 0.35rem;
}
.vma-deck__month h3 {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.65rem;
}
.vma-deck__month ul {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.88rem;
  line-height: 1.5;
}
.vma-deck__investment {
  background: linear-gradient(160deg, #0b1220 0%, var(--vma-primary) 100%);
  color: #f8fafc;
}
.vma-deck__pricing {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  margin-bottom: 1.5rem;
}
.vma-deck__price-card {
  border: 1px solid color-mix(in srgb, white 20%, transparent);
  border-radius: 0.5rem;
  padding: 1.25rem;
}
.vma-deck__price-name {
  font-weight: 800;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  margin: 0 0 1rem;
}
.vma-deck__price-line {
  margin: 0.5rem 0;
  font-size: 0.95rem;
}
.vma-deck__price-line strong {
  display: block;
  font-size: 1.65rem;
  margin-top: 0.25rem;
}
.vma-deck__price-line--muted {
  opacity: 0.65;
}
.vma-deck__price-preferred strong {
  color: color-mix(in srgb, white 95%, var(--vma-accent));
}
.vma-deck__savings {
  font-size: 0.85rem;
  margin: 0.75rem 0 0;
  color: #86efac;
  font-weight: 600;
}
.vma-deck__bonus {
  border-left: 3px solid var(--vma-accent);
  padding-left: 1rem;
}
.vma-deck__bonus-title {
  font-weight: 800;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  margin: 0 0 0.5rem;
}
.vma-deck__bonus p,
.vma-deck__next p {
  font-size: 0.92rem;
  line-height: 1.55;
  margin: 0;
  opacity: 0.9;
}
.vma-deck__next {
  margin: 1rem 0;
}
.vma-deck__next-label {
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  font-weight: 700;
  margin: 0 0 0.5rem;
}
.vma-deck__footnote {
  font-size: 0.8rem;
  opacity: 0.75;
  line-height: 1.5;
  margin: 1rem 0 0;
}
.vma-deck__foot {
  margin-top: auto;
  padding-top: 2rem;
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.55;
}
.vma-deck__foot--dark {
  color: color-mix(in srgb, var(--vma-text) 55%, transparent);
}
@media print {
  .vma-deck__page {
    page-break-after: always;
    min-height: 10.5in;
    break-inside: avoid;
  }
  .vma-deck__page:last-child {
    page-break-after: auto;
  }
}
</style>