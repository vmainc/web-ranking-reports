<script setup lang="ts">
import type { ReportModule, ReportBuilderModel } from '~/types/reportBuilder'
import type { SiteRecord } from '~/types'

const props = defineProps<{
  module: Extract<ReportModule, { type: 'report_cover' }>
}>()

const model = inject<Ref<ReportBuilderModel | null>>('reportBuilderModel', ref(null))
const site = inject<Ref<SiteRecord | null>>('reportPreviewSite', ref(null))

const tagline = computed(() => props.module.settings.tagline?.trim() || '')

const generated = computed(() => {
  try {
    return new Date().toLocaleDateString(undefined, { dateStyle: 'long' })
  } catch {
    return ''
  }
})
</script>

<template>
  <div class="cover-report-module flex min-h-[52vh] flex-col items-center justify-center rounded-xl border border-surface-100 bg-gradient-to-b from-white to-surface-50 px-6 py-12 text-center print:min-h-[70vh] print:border-0 print:bg-white">
    <p v-if="tagline" class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-surface-500">{{ tagline }}</p>
    <h2 class="text-3xl font-bold tracking-tight text-surface-900 print:text-4xl">
      {{ model?.title || 'Report title' }}
    </h2>
    <p v-if="model?.subtitle" class="mt-3 max-w-xl text-base text-surface-600">{{ model.subtitle }}</p>
    <p v-if="site?.name" class="mt-8 text-lg font-medium text-surface-800">{{ site.name }}</p>
    <p v-if="site?.domain" class="mt-1 text-sm text-surface-500">{{ site.domain }}</p>
    <p class="mt-10 text-sm text-surface-500">{{ generated }}</p>
  </div>
</template>
