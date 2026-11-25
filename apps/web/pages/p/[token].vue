<template>
  <div class="min-h-screen bg-slate-100">
    <div v-if="pending" class="py-20 text-center text-slate-500">Loading proposal…</div>
    <div v-else-if="errorMessage" class="mx-auto max-w-lg px-4 py-20 text-center">
      <p class="text-lg font-semibold text-slate-800">{{ errorMessage }}</p>
      <p class="mt-3 text-sm text-slate-500">If the page looks broken, hard-refresh or open this link in a new window.</p>
    </div>
    <div v-else-if="proposal" class="py-6">
      <ProposalPublicView
        v-show="showBrandedDeck"
        :proposal="proposal"
        :show-accept="true"
        :busy="busy"
        :error="actionError"
        @accept="onAccept"
        @decline="onDecline"
      />
      <article v-show="!showBrandedDeck" class="mx-auto max-w-3xl px-4 pb-12 text-slate-800 print:max-w-none">
        <header class="border-b border-slate-200 pb-6">
          <p v-if="proposal.branding_json?.name" class="text-xs uppercase tracking-wide text-blue-700">
            {{ proposal.branding_json.name }}
          </p>
          <h1 class="mt-2 text-2xl font-bold">{{ proposal.title }}</h1>
          <p v-if="proposal.client_name" class="mt-2 text-slate-600">Prepared for {{ proposal.client_name }}</p>
        </header>

        <section
          v-if="staticDeck?.cover?.headline"
          class="mt-8 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white"
        >
          <p class="text-xs uppercase tracking-widest text-blue-300">{{ staticDeck.cover.eyebrow }}</p>
          <p class="mt-3 text-3xl font-extrabold uppercase leading-tight">{{ staticDeck.cover.headline }}</p>
          <p v-if="staticDeck.cover.subhead" class="mt-4 text-slate-200">{{ staticDeck.cover.subhead }}</p>
          <p v-if="staticDeck.cover.proposal_type" class="mt-6 text-lg font-semibold">{{ staticDeck.cover.proposal_type }}</p>
        </section>

        <section v-if="staticDeck?.opportunity?.pillars?.length" class="mt-10 space-y-4">
          <h2 class="text-sm font-bold uppercase tracking-wide text-slate-500">{{ staticDeck.opportunity.title }}</h2>
          <p v-if="staticDeck.opportunity.intro" class="text-slate-700">{{ staticDeck.opportunity.intro }}</p>
          <div
            v-for="(pillar, i) in staticDeck.opportunity.pillars"
            :key="i"
            class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 class="font-semibold text-slate-900">{{ pillar.title }}</h3>
            <p class="mt-2 text-sm text-slate-600">{{ pillar.body }}</p>
          </div>
        </section>

        <section v-if="staticDeck?.ninety_days?.months?.length" class="mt-10 space-y-4">
          <h2 class="text-sm font-bold uppercase tracking-wide text-slate-500">{{ staticDeck.ninety_days.title }}</h2>
          <p v-if="staticDeck.ninety_days.intro" class="text-slate-700">{{ staticDeck.ninety_days.intro }}</p>
          <div
            v-for="(month, i) in staticDeck.ninety_days.months"
            :key="i"
            class="rounded-lg border border-slate-200 bg-white p-5"
          >
            <p class="text-xs font-bold text-blue-700">{{ month.label }}</p>
            <h3 class="mt-1 font-semibold">{{ month.title }}</h3>
            <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li v-for="(b, j) in month.bullets" :key="j">{{ b }}</li>
            </ul>
          </div>
        </section>

        <section v-if="staticDeck?.investment" class="mt-10 rounded-xl bg-slate-900 p-8 text-white">
          <h2 class="text-sm uppercase tracking-wide text-blue-300">{{ staticDeck.investment.title }}</h2>
          <p class="mt-4 text-lg">{{ staticDeck.investment.intro }}</p>
          <p class="mt-4 text-xl font-bold">{{ staticDeck.investment.package_name }}</p>
          <p v-if="staticDeck.investment.preferred_rate != null" class="mt-2 text-2xl font-extrabold">
            {{ money(staticDeck.investment.preferred_rate) }}
            <span v-if="monthlyInvestment">/ month</span>
          </p>
          <p v-else-if="staticDeck.investment.standard_rate != null" class="mt-2 text-2xl font-extrabold">
            {{ money(staticDeck.investment.standard_rate) }}
          </p>
          <p v-if="staticDeck.investment.bonus_body" class="mt-4 text-sm text-slate-300">{{ staticDeck.investment.bonus_body }}</p>
          <p v-if="staticDeck.investment.next_steps" class="mt-6 text-sm text-slate-200">{{ staticDeck.investment.next_steps }}</p>
        </section>

        <section v-else-if="proposal.intro_html" class="mt-8 whitespace-pre-wrap text-slate-700">
          {{ proposal.intro_html }}
        </section>

        <section v-if="canRespond" class="mt-10 print:hidden">
          <p class="text-sm text-slate-500">Accept/decline loads when JavaScript is available. Refresh if this page stays static.</p>
        </section>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { normalizeProposalDeck } from '~/lib/proposalDeck'
import type { PublicProposalDto } from '~/components/crm/ProposalPublicView.vue'

definePageMeta({ layout: false, ssr: true })

const route = useRoute()
const token = computed(() => String(route.params.token || ''))

const { data, error, pending, refresh } = usePublicProposal(token)

const proposal = computed(() => data.value ?? null)

const staticDeck = computed(() =>
  proposal.value ? normalizeProposalDeck(proposal.value.presentation_json) : null,
)

const showBrandedDeck = ref(false)

const canRespond = computed(() =>
  proposal.value ? ['sent', 'viewed'].includes(proposal.value.status) : false,
)

const monthlyInvestment = computed(() => {
  const inv = staticDeck.value?.investment
  if (!inv) return false
  const note = (inv.preferred_note || '').toLowerCase()
  const label = (inv.standard_rate_label || '').toLowerCase()
  return note.includes('month') || label.includes('month')
})

function money(n: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: proposal.value?.currency || 'USD',
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `$${Math.round(n)}`
  }
}

const errorMessage = computed(() => {
  if (!error.value) return ''
  const err = error.value as { statusCode?: number; data?: { message?: string }; message?: string }
  if (err?.statusCode === 410) return 'This proposal has expired.'
  return err?.data?.message ?? err?.message ?? 'Proposal not found'
})

const busy = ref(false)
const actionError = ref('')

async function markViewed(p: PublicProposalDto) {
  if (!import.meta.client || !['sent', 'viewed'].includes(p.status)) return
  await $fetch(`/api/proposals/public/${token.value}/view`, { method: 'POST' }).catch(() => null)
  if (p.status === 'sent' && data.value) {
    data.value = { ...data.value, status: 'viewed' }
  }
}

function tryShowBrandedDeck() {
  if (typeof document === 'undefined') return
  if (document.querySelector('.vma-deck')) showBrandedDeck.value = true
}

onMounted(() => {
  if (proposal.value) void markViewed(proposal.value)
  tryShowBrandedDeck()
  window.setTimeout(tryShowBrandedDeck, 1200)
  window.setTimeout(tryShowBrandedDeck, 4000)
})

watch(proposal, (p) => {
  if (p && showBrandedDeck.value) void markViewed(p)
})

async function onAccept(payload: { name: string; email: string }) {
  busy.value = true
  actionError.value = ''
  try {
    const res = await $fetch<{ already?: boolean; effects?: { errors?: string[] } }>(
      `/api/proposals/public/${token.value}/accept`,
      { method: 'POST', body: payload },
    )
    if (data.value) data.value = { ...data.value, status: 'accepted' }
    const errs = res.effects?.errors
    if (errs?.length) actionError.value = `Accepted, with warnings: ${errs.join('; ')}`
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    actionError.value = err?.data?.message ?? err?.message ?? 'Could not accept'
  } finally {
    busy.value = false
  }
}

async function onDecline() {
  if (import.meta.client && !window.confirm('Decline this proposal?')) return
  busy.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/proposals/public/${token.value}/decline`, { method: 'POST', body: {} })
    if (data.value) data.value = { ...data.value, status: 'declined' }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    actionError.value = err?.data?.message ?? err?.message ?? 'Could not decline'
  } finally {
    busy.value = false
  }
}

useHead({
  title: computed(() => (proposal.value ? proposal.value.title : 'Proposal')),
})

watch(token, () => refresh())
</script>