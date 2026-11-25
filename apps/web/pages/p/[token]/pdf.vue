<template>
  <div class="bg-white">
    <div v-if="pending" class="py-20 text-center text-slate-500">Preparing PDF…</div>
    <div v-else-if="errorMessage" class="p-8 text-center text-red-600">{{ errorMessage }}</div>
    <ProposalPublicView v-else-if="proposal" :proposal="proposal" :show-accept="false" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false, ssr: true })

const route = useRoute()
const token = computed(() => String(route.params.token || ''))

const { data, error, pending } = usePublicProposal(token)

const proposal = computed(() => data.value ?? null)

const errorMessage = computed(() => {
  if (!error.value) return ''
  const err = error.value as { data?: { message?: string }; message?: string }
  return err?.data?.message ?? err?.message ?? 'Failed to load'
})

function signalPdfReady() {
  if (import.meta.client) {
    ;(window as unknown as { __PROPOSAL_PDF_READY__?: boolean }).__PROPOSAL_PDF_READY__ = true
  }
}

watch(
  () => [pending.value, proposal.value, errorMessage.value] as const,
  ([p]) => {
    if (!p) signalPdfReady()
  },
  { immediate: true },
)

onMounted(() => {
  nextTick(() => signalPdfReady())
})
</script>