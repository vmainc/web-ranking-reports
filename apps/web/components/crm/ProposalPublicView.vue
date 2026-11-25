<template>
  <div class="proposal-public" :class="{ 'proposal-public--deck': !!deck }">
    <ProposalBrandedDeck
      v-if="deck"
      :deck="deck"
      :client-name="proposal.client_name"
      :client-location="proposal.client_location"
      :proposal-date="proposalDate"
      :currency="proposal.currency"
      :logo-url="logoUrl"
      :colors="colors"
    />

    <template v-else>
      <header class="proposal-public__header" :style="cssVars">
        <div class="proposal-public__brand">
          <img v-if="logoUrl" :src="logoUrl" alt="" class="proposal-public__logo" />
          <div>
            <p v-if="agencyName" class="proposal-public__agency">{{ agencyName }}</p>
            <h1 class="proposal-public__title">{{ proposal.title }}</h1>
          </div>
        </div>
      </header>
      <section v-if="proposal.intro_html" class="proposal-public__section">
        <div class="proposal-public__prose whitespace-pre-wrap">{{ proposal.intro_html }}</div>
      </section>
    </template>

    <section
      v-if="showAccept && canRespond"
      class="proposal-public__accept print:hidden"
      :class="deck ? 'proposal-public__accept--deck' : 'proposal-public__section'"
    >
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

    <p v-else-if="proposal.status === 'accepted'" class="proposal-public__banner print:hidden">This proposal was accepted. Thank you.</p>
    <p v-else-if="proposal.status === 'declined'" class="proposal-public__banner print:hidden">This proposal was declined.</p>
  </div>
</template>

<script setup lang="ts">
import { normalizeProposalDeck, type ProposalDeckPresentation } from '~/lib/proposalDeck'

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
  sent_at?: string | null
  client_name?: string | null
  client_location?: string | null
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
  presentation_json?: ProposalDeckPresentation | unknown | null
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

const deck = computed(() => normalizeProposalDeck(props.proposal.presentation_json))

const colors = computed(() => props.proposal.branding_json?.colors || {})
const cssVars = computed(() => ({
  '--proposal-primary': colors.value.primary || '#2563EB',
  '--proposal-accent': colors.value.accent || '#1D4ED8',
  '--proposal-text': colors.value.text || '#0F172A',
  '--proposal-surface': colors.value.surface || '#FFFFFF',
}))

const agencyName = computed(() => props.proposal.branding_json?.name || '')
const logoUrl = computed(() => props.proposal.branding_json?.logo_url || '')

const proposalDate = computed(
  () => props.proposal.sent_at || props.proposal.valid_until || props.proposal.snapshot_json?.captured_at || null,
)

const canRespond = computed(() => ['sent', 'viewed'].includes(props.proposal.status))
</script>

<style scoped>
.proposal-public--deck {
  max-width: none;
  padding: 0;
}
.proposal-public__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 3px solid var(--proposal-primary);
  padding: 2rem 1.25rem 1.25rem;
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
.proposal-public__section,
.proposal-public__accept--deck {
  max-width: 52rem;
  margin: 0 auto 2rem;
  padding: 0 1.25rem;
}
.proposal-public__accept--deck {
  padding-top: 1rem;
  font-family: system-ui, sans-serif;
}
.proposal-public__input {
  width: 100%;
  margin-top: 0.25rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-family: system-ui, sans-serif;
}
.proposal-public__btn {
  font-family: system-ui, sans-serif;
  background: var(--proposal-primary, #2563eb);
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0.55rem 1rem;
  font-weight: 600;
  cursor: pointer;
}
.proposal-public__btn--ghost {
  background: transparent;
  color: #0f172a;
  border: 1px solid #cbd5e1;
}
.proposal-public__banner {
  font-family: system-ui, sans-serif;
  max-width: 52rem;
  margin: 1rem auto 2rem;
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  background: #eff6ff;
}
.whitespace-pre-wrap { white-space: pre-wrap; }
.space-y-3 > * + * { margin-top: 0.75rem; }
.flex { display: flex; }
.flex-wrap { flex-wrap: wrap; }
.gap-2 { gap: 0.5rem; }
.text-sm { font-size: 0.875rem; }
.text-red-600 { color: #dc2626; }
.block { display: block; }
.font-medium { font-weight: 600; }
</style>