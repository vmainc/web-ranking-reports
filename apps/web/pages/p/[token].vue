<template>
  <div class="min-h-screen bg-slate-100">
    <div v-if="pending" class="py-20 text-center text-slate-500">Loading proposal…</div>
    <div v-else-if="loadError" class="mx-auto max-w-lg px-4 py-20 text-center">
      <p class="text-lg font-semibold text-slate-800">{{ loadError }}</p>
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

definePageMeta({ layout: false })

const route = useRoute()
const token = computed(() => String(route.params.token || ''))

const proposal = ref<PublicProposalDto | null>(null)
const pending = ref(true)
const loadError = ref('')
const busy = ref(false)
const actionError = ref('')

async function load() {
  if (!token.value) return
  pending.value = true
  loadError.value = ''
  try {
    const data = await $fetch<{ proposal: PublicProposalDto }>(`/api/proposals/public/${token.value}`)
    proposal.value = data.proposal
    if (['sent', 'viewed'].includes(data.proposal.status)) {
      await $fetch(`/api/proposals/public/${token.value}/view`, { method: 'POST' }).catch(() => null)
      if (data.proposal.status === 'sent') {
        proposal.value = { ...data.proposal, status: 'viewed' }
      }
    }
  } catch (e: unknown) {
    const err = e as { statusCode?: number; data?: { message?: string }; message?: string }
    loadError.value =
      err?.statusCode === 410
        ? 'This proposal has expired.'
        : err?.data?.message ?? err?.message ?? 'Proposal not found'
    proposal.value = null
  } finally {
    pending.value = false
  }
}

async function onAccept(payload: { name: string; email: string }) {
  busy.value = true
  actionError.value = ''
  try {
    const data = await $fetch<{ already?: boolean; effects?: { errors?: string[] } }>(
      `/api/proposals/public/${token.value}/accept`,
      { method: 'POST', body: payload },
    )
    if (proposal.value) {
      proposal.value = { ...proposal.value, status: 'accepted' }
    }
    const errs = data.effects?.errors
    if (errs?.length) {
      actionError.value = `Accepted, with warnings: ${errs.join('; ')}`
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    actionError.value = err?.data?.message ?? err?.message ?? 'Could not accept'
  } finally {
    busy.value = false
  }
}

async function onDecline() {
  if (!window.confirm('Decline this proposal?')) return
  busy.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/proposals/public/${token.value}/decline`, { method: 'POST', body: {} })
    if (proposal.value) proposal.value = { ...proposal.value, status: 'declined' }
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

onMounted(load)
watch(token, load)
</script>
