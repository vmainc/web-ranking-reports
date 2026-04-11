<template>
  <div
    v-if="show"
    class="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-900 print:hidden"
  >
    <span class="font-medium">Your free trial ends in {{ days }} {{ days === 1 ? 'day' : 'days' }}.</span>
    <NuxtLink :to="{ path: '/settings/billing', query: { site: siteId } }" class="ml-2 font-semibold text-primary-700 underline">
      View billing
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ siteId: string }>()

const { fetchSiteBillingStatus } = useBilling()
const days = ref(0)
const show = ref(false)

watch(
  () => props.siteId,
  async (id) => {
    show.value = false
    if (!id) return
    try {
      const st = await fetchSiteBillingStatus(id)
      if (!st || st.locked) return
      const d = st.trialDaysRemaining
      if (d != null && d > 0) {
        days.value = d
        show.value = true
      }
    } catch {
      // ignore
    }
  },
  { immediate: true },
)
</script>
