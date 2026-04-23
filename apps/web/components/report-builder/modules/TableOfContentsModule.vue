<script setup lang="ts">
import type { ReportBuilderModel, ReportModule } from '~/types/reportBuilder'

const props = withDefaults(
  defineProps<{
    module: Extract<ReportModule, { type: 'table_of_contents' }>
    /** `preview` = client/PDF: no page suffix, links to sections, trims “ · …” admin suffixes from titles. */
    variant?: 'builder' | 'preview'
  }>(),
  { variant: 'builder' },
)

const model = inject<Ref<ReportBuilderModel | null>>('reportBuilderModel', ref(null))

const isPreview = computed(() => props.variant === 'preview')

type TocRow = { label: string; pageLabel: string; moduleId: string }

const rows = computed<TocRow[]>(() => {
  const m = model.value
  if (!m?.pages?.length) return []
  const showPage = props.module.settings.showPageLabels !== false && !isPreview.value
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

/** Strip trailing “ · …” from saved titles so client TOC matches on-page headings. */
function clientTocTitle(raw: string) {
  const t = raw.trim()
  const i = t.indexOf(' · ')
  if (i <= 0) return t
  return t.slice(0, i).trim() || t
}

function rowDisplayLabel(r: TocRow) {
  return isPreview.value ? clientTocTitle(r.label) : r.label
}

function moduleHref(moduleId: string) {
  return `#report-module-${moduleId}`
}
</script>

<template>
  <div class="toc-report-module rounded-xl border border-surface-100 bg-white px-5 py-4 text-left print:border-surface-200">
    <h3 class="text-sm font-semibold uppercase tracking-wide text-surface-500">Table of contents</h3>
    <ol v-if="rows.length" class="mt-4 list-decimal space-y-2 pl-5 text-sm text-surface-800">
      <li v-for="r in rows" :key="r.moduleId" class="pl-1">
        <template v-if="isPreview">
          <a
            :href="moduleHref(r.moduleId)"
            class="font-medium text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-800 print:text-surface-900 print:no-underline"
          >
            {{ rowDisplayLabel(r) }}
          </a>
        </template>
        <template v-else>
          <span class="font-medium">{{ rowDisplayLabel(r) }}</span>
          <span v-if="r.pageLabel" class="text-surface-500"> · {{ r.pageLabel }}</span>
        </template>
      </li>
    </ol>
    <p v-else class="mt-3 text-sm text-surface-500">Add modules to the report body pages — entries appear here automatically.</p>
  </div>
</template>
