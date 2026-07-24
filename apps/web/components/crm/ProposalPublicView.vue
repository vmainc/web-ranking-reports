<template>
  <div class="proposal-public" :style="cssVars">
    <header class="proposal-public__header">
      <div class="proposal-public__brand">
        <img v-if="logoUrl" :src="logoUrl" alt="" class="proposal-public__logo" />
        <div>
          <p v-if="agencyName" class="proposal-public__agency">{{ agencyName }}</p>
          <h1 class="proposal-public__title">{{ proposal.title }}</h1>
          <p class="proposal-public__meta">
            <span v-if="proposal.client_name">For {{ proposal.client_name }}</span>
            <span v-if="proposal.client_name"> · </span>
            Version {{ proposal.version }}
            <span v-if="proposal.valid_until"> · Valid until {{ formatDate(proposal.valid_until) }}</span>
          </p>
        </div>
      </div>
      <p class="proposal-public__status capitalize">{{ proposal.status }}</p>
    </header>

    <section v-if="proposal.intro_html" class="proposal-public__section">
      <h2>Overview</h2>
      <div class="proposal-public__prose whitespace-pre-wrap">{{ proposal.intro_html }}</div>
    </section>

    <section class="proposal-public__section">
      <h2>Investment</h2>
      <table class="proposal-public__table">
        <thead>
          <tr>
            <th>Item</th>
            <th class="num">Qty</th>
            <th class="num">Price</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="it in proposal.items" :key="it.id">
            <td>
              <div class="font-medium">{{ it.name }}</div>
              <div v-if="it.description" class="muted">{{ it.description }}</div>
              <div v-if="it.billing_interval && it.billing_interval !== 'one_time'" class="muted capitalize">
                {{ it.billing_interval }}
              </div>
            </td>
            <td class="num">{{ it.qty }}</td>
            <td class="num">{{ money(it.unit_price) }}</td>
            <td class="num">{{ money(Number(it.qty) * Number(it.unit_price)) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="num font-semibold">Total</td>
            <td class="num font-semibold">{{ money(proposal.total ?? 0) }}</td>
          </tr>
        </tfoot>
      </table>
    </section>

    <section v-if="hasSnapshotNotes" class="proposal-public__section">
      <h2>Digital Snapshot</h2>
      <p v-if="proposal.snapshot_json?.website_url" class="muted mb-3">
        Website: {{ proposal.snapshot_json.website_url }}
      </p>
      <div class="proposal-public__notes">
        <div v-for="block in snapshotBlocks" :key="block.label">
          <h3>{{ block.label }}</h3>
          <p class="whitespace-pre-wrap">{{ block.text }}</p>
        </div>
      </div>
      <p v-if="proposal.snapshot_json?.captured_at" class="muted mt-3 text-xs">
        Snapshot frozen {{ formatDate(proposal.snapshot_json.captured_at) }}
      </p>
    </section>

    <section v-if="proposal.terms_html" class="proposal-public__section">
      <h2>Terms</h2>
      <div class="proposal-public__prose whitespace-pre-wrap">{{ proposal.terms_html }}</div>
    </section>

    <section v-if="showAccept && canRespond" class="proposal-public__section proposal-public__accept print:hidden">
      <h2>Accept this proposal</h2>
      <form class="space-y-3" @submit.prevent="$emit('accept', { name: acceptName, email: acceptEmail })">
        <div>
          <label class="block text-sm font-medium">Your name *</label>
          <input v-model="acceptName" required type="text" class="proposal-public__input" />
        </div>
        <div>
          <label class="block text-sm font-medium">Email</label>
          <input v-model="acceptEmail" type="email" class="proposal-public__input" />
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="submit" class="proposal-public__btn" :disabled="busy">{{ busy ? 'Submitting…' : 'Accept' }}</button>
          <button type="button" class="proposal-public__btn proposal-public__btn--ghost" :disabled="busy" @click="$emit('decline')">
            Decline
          </button>
        </div>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      </form>
    </section>

    <p v-else-if="proposal.status === 'accepted'" class="proposal-public__banner">This proposal was accepted. Thank you.</p>
    <p v-else-if="proposal.status === 'declined'" class="proposal-public__banner">This proposal was declined.</p>
  </div>
</template>

<script setup lang="ts">
export type PublicProposalDto = {
  id: string
  title: string
  version: number
  status: string
  intro_html?: string | null
  terms_html?: string | null
  currency: string
  subtotal?: number | null
  total?: number | null
  valid_until?: string | null
  client_name?: string | null
  snapshot_json?: {
    captured_at?: string
    website_url?: string
    intake?: Record<string, unknown>
  } | null
  branding_json?: {
    name?: string
    logo_url?: string | null
    colors?: { primary?: string; accent?: string; text?: string; surface?: string }
  } | null
  items: Array<{
    id: string
    name: string
    description?: string | null
    qty: number
    unit_price: number
    billing_interval?: string | null
  }>
}

const props = withDefaults(
  defineProps<{
    proposal: PublicProposalDto
    showAccept?: boolean
    busy?: boolean
    error?: string
  }>(),
  { showAccept: true, busy: false, error: '' },
)

defineEmits<{
  accept: [payload: { name: string; email: string }]
  decline: []
}>()

const acceptName = ref('')
const acceptEmail = ref('')

const colors = computed(() => props.proposal.branding_json?.colors || {})
const cssVars = computed(() => ({
  '--proposal-primary': colors.value.primary || '#2563EB',
  '--proposal-accent': colors.value.accent || '#1D4ED8',
  '--proposal-text': colors.value.text || '#0F172A',
  '--proposal-surface': colors.value.surface || '#FFFFFF',
}))

const agencyName = computed(() => props.proposal.branding_json?.name || '')
const logoUrl = computed(() => props.proposal.branding_json?.logo_url || '')

const canRespond = computed(() => ['sent', 'viewed'].includes(props.proposal.status))

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
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
  } catch {
    return iso
  }
}
</script>

<style scoped>
.proposal-public {
  --proposal-primary: #2563eb;
  --proposal-accent: #1d4ed8;
  --proposal-text: #0f172a;
  --proposal-surface: #ffffff;
  color: var(--proposal-text);
  background: var(--proposal-surface);
  max-width: 48rem;
  margin: 0 auto;
  padding: 2rem 1.25rem 3rem;
  font-family: Georgia, 'Times New Roman', serif;
}
.proposal-public__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 3px solid var(--proposal-primary);
  padding-bottom: 1.25rem;
  margin-bottom: 1.75rem;
}
.proposal-public__brand {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}
.proposal-public__logo {
  height: 2.75rem;
  width: auto;
  max-width: 8rem;
  object-fit: contain;
}
.proposal-public__agency {
  font-family: system-ui, sans-serif;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--proposal-accent);
  margin: 0 0 0.35rem;
}
.proposal-public__title {
  font-size: 1.75rem;
  line-height: 1.2;
  margin: 0;
}
.proposal-public__meta,
.muted {
  font-family: system-ui, sans-serif;
  font-size: 0.875rem;
  color: color-mix(in srgb, var(--proposal-text) 65%, transparent);
}
.proposal-public__status {
  font-family: system-ui, sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  align-self: flex-start;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--proposal-primary) 12%, transparent);
  color: var(--proposal-primary);
}
.proposal-public__section {
  margin-bottom: 1.75rem;
}
.proposal-public__section h2 {
  font-size: 1.1rem;
  margin: 0 0 0.75rem;
  color: var(--proposal-primary);
}
.proposal-public__section h3 {
  font-family: system-ui, sans-serif;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0.75rem 0 0.25rem;
}
.proposal-public__table {
  width: 100%;
  border-collapse: collapse;
  font-family: system-ui, sans-serif;
  font-size: 0.9rem;
}
.proposal-public__table th,
.proposal-public__table td {
  border-bottom: 1px solid color-mix(in srgb, var(--proposal-text) 12%, transparent);
  padding: 0.65rem 0.35rem;
  text-align: left;
  vertical-align: top;
}
.proposal-public__table .num {
  text-align: right;
  white-space: nowrap;
}
.proposal-public__input {
  width: 100%;
  margin-top: 0.25rem;
  border: 1px solid color-mix(in srgb, var(--proposal-text) 20%, transparent);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-family: system-ui, sans-serif;
}
.proposal-public__btn {
  font-family: system-ui, sans-serif;
  background: var(--proposal-primary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0.55rem 1rem;
  font-weight: 600;
  cursor: pointer;
}
.proposal-public__btn--ghost {
  background: transparent;
  color: var(--proposal-text);
  border: 1px solid color-mix(in srgb, var(--proposal-text) 25%, transparent);
}
.proposal-public__banner {
  font-family: system-ui, sans-serif;
  padding: 1rem;
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--proposal-primary) 10%, transparent);
}
.mb-3 { margin-bottom: 0.75rem; }
.mt-3 { margin-top: 0.75rem; }
.text-xs { font-size: 0.75rem; }
.font-medium { font-weight: 600; }
.font-semibold { font-weight: 700; }
.space-y-3 > * + * { margin-top: 0.75rem; }
.flex { display: flex; }
.flex-wrap { flex-wrap: wrap; }
.gap-2 { gap: 0.5rem; }
.whitespace-pre-wrap { white-space: pre-wrap; }
.capitalize { text-transform: capitalize; }
.text-sm { font-size: 0.875rem; }
.text-red-600 { color: #dc2626; }
</style>
