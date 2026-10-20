<template>
  <article class="proposal-doc" :class="{ 'proposal-doc--pdf': pdfMode }" :style="cssVars">
    <div class="proposal-doc__page proposal-doc__cover">
      <div class="proposal-doc__cover-bar" />
      <div class="proposal-doc__cover-inner">
        <img v-if="logoUrl" :src="logoUrl" alt="" class="proposal-doc__logo" />
        <p v-if="agencyName" class="proposal-doc__agency">{{ agencyName }}</p>
        <h1 class="proposal-doc__cover-title">{{ coverTitle }}</h1>
        <p v-if="clientLabel" class="proposal-doc__cover-client">Prepared for {{ clientLabel }}</p>
        <dl class="proposal-doc__cover-meta">
          <div v-if="content.client.proposal_date">
            <dt>Date</dt>
            <dd>{{ formatDate(content.client.proposal_date) }}</dd>
          </div>
          <div v-if="expirationLabel">
            <dt>Valid through</dt>
            <dd>{{ expirationLabel }}</dd>
          </div>
          <div v-if="content.client.project_title">
            <dt>Project</dt>
            <dd>{{ content.client.project_title }}</dd>
          </div>
        </dl>
      </div>
      <footer class="proposal-doc__page-footer"><span class="proposal-doc__page-num" /></footer>
    </div>

    <template v-for="section in renderedSections" :key="section.id">
      <div v-if="section.key === 'investment'" class="proposal-doc__page">
        <header class="proposal-doc__section-head">
          <h2>{{ section.title }}</h2>
        </header>
        <div v-if="oneTimeItems.length" class="proposal-doc__invest-block">
          <h3>One-time fees</h3>
          <table class="proposal-doc__table">
            <thead>
              <tr>
                <th>Service</th>
                <th class="num">Qty</th>
                <th class="num">Unit</th>
                <th class="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in oneTimeItems" :key="it.id">
                <td>
                  <span class="proposal-doc__line-name">{{ it.name }}</span>
                  <span v-if="isOptional(it)" class="proposal-doc__optional">Optional</span>
                  <p v-if="it.description" class="proposal-doc__muted">{{ it.description }}</p>
                </td>
                <td class="num">{{ it.qty }}</td>
                <td class="num">{{ money(it.unit_price) }}</td>
                <td class="num">{{ money(lineTotal(it)) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="totals">
              <tr>
                <td colspan="3" class="num">Subtotal</td>
                <td class="num">{{ money(totals.one_time_subtotal) }}</td>
              </tr>
              <tr v-if="totals.one_time_discount > 0">
                <td colspan="3" class="num">Discount</td>
                <td class="num">−{{ money(totals.one_time_discount) }}</td>
              </tr>
              <tr>
                <td colspan="3" class="num proposal-doc__total-label">One-time total</td>
                <td class="num proposal-doc__total">{{ money(totals.one_time_total) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div v-for="block in recurringBlocks" :key="block.interval" class="proposal-doc__invest-block">
          <h3>{{ block.label }} services</h3>
          <table class="proposal-doc__table">
            <thead>
              <tr>
                <th>Service</th>
                <th class="num">Qty</th>
                <th class="num">Unit / {{ block.label.toLowerCase() }}</th>
                <th class="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in block.items" :key="it.id">
                <td>
                  <span class="proposal-doc__line-name">{{ it.name }}</span>
                  <span v-if="isOptional(it)" class="proposal-doc__optional">Optional</span>
                  <p v-if="it.description" class="proposal-doc__muted">{{ it.description }}</p>
                </td>
                <td class="num">{{ it.qty }}</td>
                <td class="num">{{ money(it.unit_price) }}</td>
                <td class="num">{{ money(lineTotal(it)) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="num">{{ block.label }} subtotal</td>
                <td class="num">{{ money(block.subtotal) }}</td>
              </tr>
              <tr v-if="block.discount > 0">
                <td colspan="3" class="num">Discount</td>
                <td class="num">−{{ money(block.discount) }}</td>
              </tr>
              <tr>
                <td colspan="3" class="num proposal-doc__total-label">{{ block.label }} total</td>
                <td class="num proposal-doc__total">{{ money(block.total) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p v-if="!proposal.items.length" class="proposal-doc__muted">Investment details to be confirmed.</p>
        <p v-else class="proposal-doc__muted proposal-doc__billing-note">{{ totals?.currency_note }}</p>
        <footer class="proposal-doc__page-footer"><span class="proposal-doc__page-num" /></footer>
      </div>

      <div v-else-if="section.key === 'acceptance'" class="proposal-doc__page">
        <header class="proposal-doc__section-head"><h2>{{ section.title }}</h2></header>
        <div v-if="section.body.trim()" class="proposal-doc__body whitespace-pre-wrap">{{ section.body }}</div>
        <div class="proposal-doc__signature-grid">
          <div>
            <p class="proposal-doc__sig-label">Client name</p>
            <div class="proposal-doc__sig-line">{{ acceptedName || ' ' }}</div>
          </div>
          <div>
            <p class="proposal-doc__sig-label">Signature</p>
            <div class="proposal-doc__sig-line proposal-doc__sig-line--tall" />
          </div>
          <div>
            <p class="proposal-doc__sig-label">Date</p>
            <div class="proposal-doc__sig-line">{{ acceptedDate || ' ' }}</div>
          </div>
        </div>
        <slot name="accept" />
        <footer class="proposal-doc__page-footer"><span class="proposal-doc__page-num" /></footer>
      </div>

      <div v-else-if="section.body.trim() || section.key === 'executive_summary'" class="proposal-doc__page">
        <header class="proposal-doc__section-head"><h2>{{ section.title }}</h2></header>
        <div v-if="section.key === 'executive_summary' && brandMission" class="proposal-doc__callout">
          <p class="proposal-doc__callout-label">Our mission</p>
          <p class="proposal-doc__callout-text">{{ brandMission }}</p>
        </div>
        <div v-if="section.body.trim()" class="proposal-doc__body whitespace-pre-wrap">{{ section.body }}</div>
        <div v-if="section.key === 'strategy_scope' && brandVision" class="proposal-doc__callout proposal-doc__callout--soft">
          <p class="proposal-doc__callout-label">Our vision</p>
          <p class="proposal-doc__callout-text">{{ brandVision }}</p>
        </div>
        <footer class="proposal-doc__page-footer"><span class="proposal-doc__page-num" /></footer>
      </div>
    </template>

    <div v-if="showClosingBlock" class="proposal-doc__page proposal-doc__closing">
      <div class="proposal-doc__closing-bar" />
      <p class="proposal-doc__closing-text">{{ closingText }}</p>
      <footer class="proposal-doc__page-footer"><span class="proposal-doc__page-num" /></footer>
    </div>

    <section v-if="hasSnapshotNotes" class="proposal-doc__page">
      <header class="proposal-doc__section-head"><h2>Digital snapshot</h2></header>
      <p v-if="proposal.snapshot_json?.website_url" class="proposal-doc__muted mb-3">
        Website: {{ proposal.snapshot_json.website_url }}
      </p>
      <div class="proposal-doc__body">
        <div v-for="block in snapshotBlocks" :key="block.label">
          <h3 class="proposal-doc__subhead">{{ block.label }}</h3>
          <p class="whitespace-pre-wrap">{{ block.text }}</p>
        </div>
      </div>
      <footer class="proposal-doc__page-footer"><span class="proposal-doc__page-num" /></footer>
    </section>
  </article>
</template>

<script setup lang="ts">
import {
  billingIntervalLabel,
  lineExtension,
  normalizeProposalContent,
  visibleSections,
  type ProposalContentJson,
  type ProposalTotalsBreakdown,
} from '~/utils/proposalContent'

type BrandedProposalInput = {
  title: string
  currency: string
  valid_until?: string | null
  client_name?: string | null
  content_json?: ProposalContentJson | null
  totals_breakdown?: ProposalTotalsBreakdown | null
  branding_json?: Record<string, unknown> | null
  snapshot_json?: { website_url?: string; intake?: Record<string, unknown> } | null
  items: Array<{
    id: string
    name: string
    description?: string | null
    qty: number
    unit_price: number
    billing_interval?: string | null
    metadata_json?: Record<string, unknown> | null
  }>
}

const props = withDefaults(
  defineProps<{
    proposal: BrandedProposalInput
    pdfMode?: boolean
    acceptedName?: string
    acceptedDate?: string
  }>(),
  { pdfMode: false, acceptedName: '', acceptedDate: '' },
)

const content = computed(() =>
  props.proposal.content_json
    ? normalizeProposalContent(props.proposal.content_json)
    : normalizeProposalContent(null),
)

const totals = computed(() => props.proposal.totals_breakdown as ProposalTotalsBreakdown | undefined)

const gradient = computed(() => {
  const b = props.proposal.branding_json as Record<string, unknown> | null
  const fromContent = content.value.brand?.gradient
  const g = Array.isArray(b?.gradient) ? (b.gradient as string[]) : fromContent
  return g?.length ? g : ['#6B21A8', '#DC2626', '#EA580C', '#D97706']
})

const colors = computed(() => {
  const b = props.proposal.branding_json as { colors?: Record<string, string>; name?: string; logo_url?: string } | null
  return {
    primary: b?.colors?.primary || gradient.value[0],
    accent: b?.colors?.accent || gradient.value[1],
    text: b?.colors?.text || '#1e293b',
    surface: b?.colors?.surface || '#ffffff',
  }
})

const cssVars = computed(() => ({
  '--proposal-primary': colors.value.primary,
  '--proposal-accent': colors.value.accent,
  '--proposal-text': colors.value.text,
  '--proposal-surface': colors.value.surface,
  '--proposal-gradient': gradient.value.join(', '),
}))

const agencyName = computed(() => (props.proposal.branding_json as { name?: string })?.name || '')
const logoUrl = computed(() => (props.proposal.branding_json as { logo_url?: string })?.logo_url || '')
const coverTitle = computed(() => content.value.client.project_title || props.proposal.title)
const clientLabel = computed(
  () => content.value.client.client_name || props.proposal.client_name || content.value.client.company || '',
)
const expirationLabel = computed(() => {
  const d = content.value.client.expiration_date || props.proposal.valid_until
  return d ? formatDate(String(d).slice(0, 10)) : ''
})

const brandMission = computed(() => {
  const b = props.proposal.branding_json as { mission?: string } | null
  return content.value.brand?.mission || b?.mission || ''
})
const brandVision = computed(() => {
  const b = props.proposal.branding_json as { vision?: string } | null
  return content.value.brand?.vision || b?.vision || ''
})

const closingText = computed(() => {
  const b = props.proposal.branding_json as { closing_statement?: string } | null
  return content.value.brand?.closing_statement || b?.closing_statement || ''
})

const showClosingBlock = computed(() => content.value.show_closing && closingText.value.trim())

const renderedSections = computed(() =>
  visibleSections(content.value).filter((s) => s.key !== 'closing' && s.key !== 'cover'),
)

type LineItem = BrandedProposalInput['items'][number]

function isOneTime(it: LineItem) {
  return !it.billing_interval || it.billing_interval === 'one_time'
}

const oneTimeItems = computed(() => props.proposal.items.filter(isOneTime))

const recurringBlocks = computed(() => {
  const map = new Map<string, LineItem[]>()
  for (const it of props.proposal.items) {
    if (isOneTime(it)) continue
    const key = it.billing_interval || 'custom'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(it)
  }
  return [...map.entries()].map(([interval, items]) => {
    const subtotal = items.reduce((s, it) => s + lineTotal(it), 0)
    const fromTotals = totals.value?.recurring.find((r) => r.interval === interval)
    return {
      interval,
      label: billingIntervalLabel(interval),
      items,
      subtotal: fromTotals?.subtotal ?? subtotal,
      discount: fromTotals?.discount ?? 0,
      total: fromTotals?.total ?? subtotal,
    }
  })
})

function lineTotal(it: LineItem) {
  return lineExtension({
    qty: it.qty,
    unit_price: it.unit_price,
    billing_interval: it.billing_interval,
    metadata_json: it.metadata_json as Record<string, unknown> | null,
  })
}

function isOptional(it: LineItem) {
  return (it.metadata_json as { optional?: boolean } | null)?.optional === true
}

function money(n: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: props.proposal.currency || 'USD',
    }).format(n)
  } catch {
    return String(n)
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso.includes('T') ? iso : `${iso}T12:00:00`).toLocaleDateString(undefined, {
      dateStyle: 'long',
    })
  } catch {
    return iso
  }
}

const snapshotBlocks = computed(() => {
  const intake = props.proposal.snapshot_json?.intake || {}
  const pairs: Array<[string, string]> = [
    ['Homepage', String(intake.homepage_notes || '')],
    ['Local visibility', String(intake.local_visibility_notes || '')],
    ['Ads presence', String(intake.ads_presence_notes || '')],
    ['Analytics', String(intake.analytics_notes || '')],
    ['Mobile / speed', String(intake.mobile_speed_notes || '')],
  ]
  return pairs.filter(([, text]) => text.trim()).map(([label, text]) => ({ label, text }))
})

const hasSnapshotNotes = computed(
  () => snapshotBlocks.value.length > 0 || !!props.proposal.snapshot_json?.website_url,
)
</script>

<style scoped>
.proposal-doc {
  --proposal-primary: #6b21a8;
  --proposal-accent: #dc2626;
  --proposal-text: #1e293b;
  --proposal-surface: #ffffff;
  color: var(--proposal-text);
  background: var(--proposal-surface);
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 11pt;
  line-height: 1.55;
  max-width: 52rem;
  margin: 0 auto;
}
.proposal-doc--pdf {
  max-width: none;
}
.proposal-doc__page {
  position: relative;
  padding: 2.25rem 2rem 3rem;
  min-height: 28rem;
  break-after: page;
  page-break-after: always;
}
.proposal-doc__cover {
  display: flex;
  flex-direction: column;
  min-height: 36rem;
  padding-top: 0;
}
.proposal-doc__cover-bar {
  height: 6px;
  background: linear-gradient(90deg, var(--proposal-gradient, var(--proposal-primary), var(--proposal-accent)));
  margin: 0 -2rem 2.5rem;
}
.proposal-doc__cover-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1rem 0 2rem;
}
.proposal-doc__logo {
  height: 3.25rem;
  width: auto;
  max-width: 14rem;
  object-fit: contain;
  margin-bottom: 1.5rem;
}
.proposal-doc__agency {
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--proposal-accent);
  margin: 0 0 0.75rem;
  font-weight: 600;
}
.proposal-doc__cover-title {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.15;
  margin: 0 0 1rem;
  color: var(--proposal-text);
  max-width: 28rem;
}
.proposal-doc__cover-client {
  font-size: 1.05rem;
  color: color-mix(in srgb, var(--proposal-text) 72%, transparent);
  margin: 0 0 2rem;
}
.proposal-doc__cover-meta {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  font-size: 0.9rem;
}
.proposal-doc__cover-meta dt {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--proposal-accent);
  font-weight: 600;
}
.proposal-doc__cover-meta dd {
  margin: 0.15rem 0 0;
}
.proposal-doc__section-head {
  border-bottom: 2px solid color-mix(in srgb, var(--proposal-primary) 35%, transparent);
  padding-bottom: 0.5rem;
  margin-bottom: 1.25rem;
}
.proposal-doc__section-head h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--proposal-primary);
}
.proposal-doc__body {
  font-size: 0.95rem;
}
.proposal-doc__subhead {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 1rem 0 0.35rem;
  color: var(--proposal-accent);
}
.proposal-doc__callout {
  border-left: 3px solid var(--proposal-primary);
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
  background: color-mix(in srgb, var(--proposal-primary) 6%, white);
}
.proposal-doc__callout--soft {
  margin-top: 1.25rem;
  border-left-color: var(--proposal-accent);
  background: color-mix(in srgb, var(--proposal-accent) 5%, white);
}
.proposal-doc__callout-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  margin: 0 0 0.35rem;
  color: var(--proposal-accent);
}
.proposal-doc__callout-text {
  margin: 0;
  font-size: 0.9rem;
}
.proposal-doc__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  margin-bottom: 1rem;
}
.proposal-doc__table th,
.proposal-doc__table td {
  border-bottom: 1px solid color-mix(in srgb, var(--proposal-text) 12%, transparent);
  padding: 0.55rem 0.4rem;
  text-align: left;
  vertical-align: top;
}
.proposal-doc__table th {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: color-mix(in srgb, var(--proposal-text) 55%, transparent);
  font-weight: 600;
}
.proposal-doc__table .num {
  text-align: right;
  white-space: nowrap;
}
.proposal-doc__line-name {
  font-weight: 600;
}
.proposal-doc__optional {
  margin-left: 0.35rem;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--proposal-accent);
  font-weight: 700;
}
.proposal-doc__total-label {
  font-weight: 700;
}
.proposal-doc__total {
  font-weight: 700;
  color: var(--proposal-primary);
}
.proposal-doc__invest-block h3 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--proposal-accent);
  margin: 0 0 0.65rem;
}
.proposal-doc__muted {
  color: color-mix(in srgb, var(--proposal-text) 58%, transparent);
  font-size: 0.85rem;
  margin: 0.25rem 0 0;
}
.proposal-doc__billing-note {
  margin-top: 1rem;
  font-style: italic;
}
.proposal-doc__signature-grid {
  display: grid;
  gap: 1.25rem;
  margin-top: 2rem;
  grid-template-columns: 1fr;
}
@media (min-width: 640px) {
  .proposal-doc__signature-grid {
    grid-template-columns: 1fr 1fr 0.75fr;
  }
}
.proposal-doc__sig-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 0.35rem;
  color: color-mix(in srgb, var(--proposal-text) 55%, transparent);
}
.proposal-doc__sig-line {
  border-bottom: 1px solid color-mix(in srgb, var(--proposal-text) 35%, transparent);
  min-height: 1.75rem;
  padding-bottom: 0.25rem;
}
.proposal-doc__sig-line--tall {
  min-height: 3rem;
}
.proposal-doc__closing {
  text-align: center;
  padding-top: 3rem;
}
.proposal-doc__closing-bar {
  width: 4rem;
  height: 4px;
  margin: 0 auto 1.5rem;
  background: linear-gradient(90deg, var(--proposal-gradient, var(--proposal-primary), var(--proposal-accent)));
  border-radius: 2px;
}
.proposal-doc__closing-text {
  font-size: 1.15rem;
  font-weight: 600;
  font-style: italic;
  color: var(--proposal-primary);
  margin: 0;
}
.proposal-doc__page-footer {
  position: absolute;
  bottom: 1rem;
  left: 2rem;
  right: 2rem;
  text-align: center;
  font-size: 0.65rem;
  color: color-mix(in srgb, var(--proposal-text) 45%, transparent);
}
.proposal-doc__page-num::after {
  content: counter(proposal-page);
}
.proposal-doc__page {
  counter-increment: proposal-page;
}
.proposal-doc {
  counter-reset: proposal-page;
}
.whitespace-pre-wrap {
  white-space: pre-wrap;
}
.mb-3 {
  margin-bottom: 0.75rem;
}
</style>
