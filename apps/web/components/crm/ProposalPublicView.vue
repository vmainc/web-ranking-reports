<template>
  <div class="proposal-public-wrap">
    <header v-if="showStatusBar" class="proposal-public-wrap__status capitalize print:hidden">
      {{ proposal.status }}
    </header>
    <ProposalBrandedDocument
      :proposal="proposal"
      :pdf-mode="pdfMode"
      :accepted-name="proposal.accepted_by_name || acceptName"
      :accepted-date="acceptedDateLabel"
    >
      <template v-if="showAccept && canRespond" #accept>
        <section class="proposal-public-wrap__accept print:hidden">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-surface-500">Accept online</h3>
          <form class="mt-3 space-y-3" @submit.prevent="$emit('accept', { name: acceptName, email: acceptEmail })">
            <div>
              <label class="block text-sm font-medium">Your name *</label>
              <input v-model="acceptName" required type="text" class="proposal-public-wrap__input" />
            </div>
            <div>
              <label class="block text-sm font-medium">Email</label>
              <input v-model="acceptEmail" type="email" class="proposal-public-wrap__input" />
            </div>
            <div class="flex flex-wrap gap-2">
              <button type="submit" class="proposal-public-wrap__btn" :disabled="busy">
                {{ busy ? 'Submitting…' : 'Accept proposal' }}
              </button>
              <button
                type="button"
                class="proposal-public-wrap__btn proposal-public-wrap__btn--ghost"
                :disabled="busy"
                @click="$emit('decline')"
              >
                Decline
              </button>
            </div>
            <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
          </form>
        </section>
      </template>
    </ProposalBrandedDocument>
    <p v-if="proposal.status === 'accepted'" class="proposal-public-wrap__banner print:hidden">
      This proposal was accepted. Thank you.
    </p>
    <p v-else-if="proposal.status === 'declined'" class="proposal-public-wrap__banner print:hidden">
      This proposal was declined.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { ProposalContentJson, ProposalTotalsBreakdown } from '~/utils/proposalContent'

export type PublicProposalDto = {
  id: string
  title: string
  version: number
  status: string
  intro_html?: string | null
  terms_html?: string | null
  content_json?: ProposalContentJson | null
  currency: string
  subtotal?: number | null
  total?: number | null
  totals_breakdown?: ProposalTotalsBreakdown | null
  valid_until?: string | null
  client_name?: string | null
  accepted_by_name?: string | null
  snapshot_json?: {
    captured_at?: string
    website_url?: string
    intake?: Record<string, unknown>
  } | null
  branding_json?: {
    name?: string
    logo_url?: string | null
    mission?: string
    vision?: string
    closing_statement?: string
    gradient?: string[]
    colors?: { primary?: string; accent?: string; text?: string; surface?: string }
  } | null
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
    proposal: PublicProposalDto
    showAccept?: boolean
    busy?: boolean
    error?: string
    pdfMode?: boolean
    showStatusBar?: boolean
  }>(),
  { showAccept: true, busy: false, error: '', pdfMode: false, showStatusBar: true },
)

defineEmits<{
  accept: [payload: { name: string; email: string }]
  decline: []
}>()

const acceptName = ref('')
const acceptEmail = ref('')

const canRespond = computed(() => ['sent', 'viewed'].includes(props.proposal.status))

const acceptedDateLabel = computed(() => {
  const iso = (props.proposal as { accepted_at?: string }).accepted_at
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'long' })
  } catch {
    return iso.slice(0, 10)
  }
})
</script>

<style scoped>
.proposal-public-wrap {
  background: #f8fafc;
  min-height: 100vh;
  padding: 1rem 0 2rem;
}
.proposal-public-wrap__status {
  max-width: 52rem;
  margin: 0 auto 0.75rem;
  padding: 0 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
}
.proposal-public-wrap__accept {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}
.proposal-public-wrap__input {
  width: 100%;
  margin-top: 0.25rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-family: system-ui, sans-serif;
}
.proposal-public-wrap__btn {
  font-family: system-ui, sans-serif;
  background: #6b21a8;
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0.55rem 1rem;
  font-weight: 600;
  cursor: pointer;
}
.proposal-public-wrap__btn--ghost {
  background: transparent;
  color: #334155;
  border: 1px solid #cbd5e1;
}
.proposal-public-wrap__banner {
  max-width: 52rem;
  margin: 1rem auto 0;
  padding: 0 1rem;
  font-family: system-ui, sans-serif;
  font-size: 0.9rem;
  color: #059669;
}
</style>
