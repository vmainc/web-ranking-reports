<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'
import CloudflareModule from '~/components/reports/CloudflareModule.vue'

defineProps<{
  module: Extract<ReportModule, { type: 'cloudflare' }>
}>()

const siteIdRef = inject<Ref<string | null>>('reportBuilderSiteId', ref(null))
const siteId = computed(() => siteIdRef.value)
</script>

<template>
  <CloudflareModule :site-id="siteId" :show-chart="module.settings.showChart" />
</template>

