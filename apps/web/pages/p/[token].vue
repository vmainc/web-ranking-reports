<template>
  <div class="min-h-screen bg-slate-100">
    <div v-if="pending" class="py-20 text-center text-slate-500">Loading proposal…</div>
    <div v-else-if="errorMessage" class="mx-auto max-w-lg px-4 py-20 text-center">
      <p class="text-lg font-semibold text-slate-800">{{ errorMessage }}</p>
      <p class="mt-3 text-sm text-slate-500">If the page looks broken, hard-refresh or open this link in a new window.</p>
    </div>
    <div v-else-if="proposal" class="py-6">
      <ProposalPublicView
        :proposal="proposal"
        :show-accept="true"
        :busy="busy"
        :error="actionError"
        @accept="onAccept"
        @decline="onDecline"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PublicProposalDto } from '~/components/crm/ProposalPublicView.vue'

definePageMeta({ layout: false, ssr: true })

const route = useRoute()
const token = computed(() => String(route.params.token || ''))

const { data, error, pending, refresh } = usePublicProposal(token)

const proposal = computed(() => data.value ?? null)

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

onMounted(() => {
  if (proposal.value) void markViewed(proposal.value)
})

watch(proposal, (p) => {
  if (p) void markViewed(p)
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