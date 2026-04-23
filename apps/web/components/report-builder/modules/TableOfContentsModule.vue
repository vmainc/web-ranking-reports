<script setup lang="ts">
import type { ReportBuilderModel, ReportModule } from '~/types/reportBuilder'

const props = defineProps<{
  module: Extract<ReportModule, { type: 'table_of_contents' }>
}>()

const model = inject<Ref<ReportBuilderModel | null>>('reportBuilderModel', ref(null))

type TocRow = { label: string; pageLabel: string; moduleId: string }

const rows = computed<TocRow[]>(() => {
  const m = model.value
  if (!m?.pages?.length) return []
  const showPage = props.module.settings.showPageLabels !== false
  const out: TocRow[] = []
  for (const page of [...m.pages].sort((a, b) => a.order - b.order)) {
    const pageLabel = page.title?.trim() || `Page ${page.order + 1}`
    for (const mod of [...page.modules].sort((a, b) => a.order - b.order)) {
      if (mod.type === 'report_cover' || mod.type === 'table_of_contents') continue
      out.push({
        label: mod.title?.trim() || 'Untitled block',
        pageLabel: showPage ? pageLabel : '',
        moduleId: mod.id,
      })
    }
  }
  return out
})
</script>

<template>
  <div class="toc-report-module rounded-xl border border-surface-100 bg-white px-5 py-4 text-left print:border-surface-200">
    <h3 class="text-sm font-semibold uppercase tracking-wide text-surface-500">Table of contents</h3>
    <ol v-if="rows.length" class="mt-4 list-decimal space-y-2 pl-5 text-sm text-surface-800">
      <li v-for="r in rows" :key="r.moduleId" class="pl-1">
        <span class="font-medium">{{ r.label }}</span>
        <span v-if="r.pageLabel" class="text-surface-500"> · {{ r.pageLabel }}</span>
      </li>
    </ol>
    <p v-else class="mt-3 text-sm text-surface-500">Add modules to the report body pages — entries appear here automatically.</p>
  </div>
</template>
