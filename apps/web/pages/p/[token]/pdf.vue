<template>
  <div class="bg-white">
    <div v-if="pending" class="py-20 text-center text-slate-500">Preparing PDF…</div>
    <div v-else-if="loadError" class="p-8 text-center text-red-600">{{ loadError }}</div>
    <ProposalPublicView v-else-if="proposal" :proposal="proposal" :show-accept="false" />
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

onMounted(async () => {
  try {
    const data = await $fetch<{ proposal: PublicProposalDto }>(`/api/proposals/public/${token.value}`)
    proposal.value = data.proposal
    await nextTick()
    ;(window as unknown as { __PROPOSAL_PDF_READY__?: boolean }).__PROPOSAL_PDF_READY__ = true
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    loadError.value = err?.data?.message ?? err?.message ?? 'Failed to load'
    ;(window as unknown as { __PROPOSAL_PDF_READY__?: boolean }).__PROPOSAL_PDF_READY__ = true
  } finally {
    pending.value = false
  }
})
</script>
