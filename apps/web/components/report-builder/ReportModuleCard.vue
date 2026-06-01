<script setup lang="ts">
import type { Component } from 'vue'
import type { ReportModule } from '~/types/reportBuilder'
import { moduleTypeLabel } from '~/utils/reportBuilderCatalog'
import TrafficOverviewModule from '~/components/report-builder/modules/TrafficOverviewModule.vue'
import KeywordRankingsModule from '~/components/report-builder/modules/KeywordRankingsModule.vue'
import ConversionsSummaryModule from '~/components/report-builder/modules/ConversionsSummaryModule.vue'
import AIInsightsModule from '~/components/report-builder/modules/AIInsightsModule.vue'
import NotesModule from '~/components/report-builder/modules/NotesModule.vue'
import ImageBrandingModule from '~/components/report-builder/modules/ImageBrandingModule.vue'
import LegacyFullReportSectionModule from '~/components/report-builder/modules/LegacyFullReportSectionModule.vue'
import CoverReportModule from '~/components/report-builder/modules/CoverReportModule.vue'
import GoogleAdsClicksModule from '~/components/report-builder/modules/GoogleAdsClicksModule.vue'
import LocalServicesAdsModule from '~/components/report-builder/modules/LocalServicesAdsModule.vue'
import BacklinksModule from '~/components/report-builder/modules/BacklinksModule.vue'
import TableOfContentsModule from '~/components/report-builder/modules/TableOfContentsModule.vue'
const props = withDefaults(
  defineProps<{
    module: ReportModule
    /** Ignored when `variant` is `preview`. */
    selected?: boolean
    variant?: 'builder' | 'preview'
    /** When true, card fills a flex slot; content is clipped (overflow hidden) to match sheet preview. */
    pageSlot?: boolean
  }>(),
  { selected: false, variant: 'builder', pageSlot: false },
)

const isBuilder = computed(() => props.variant === 'builder')

const emit = defineEmits<{
  select: []
  edit: []
  duplicate: []
  remove: []
}>()

const previewByType: Record<ReportModule['type'], Component> = {
  report_cover: CoverReportModule,
  table_of_contents: TableOfContentsModule,
  traffic_overview: TrafficOverviewModule,
  keyword_rankings: KeywordRankingsModule,
  conversions_summary: ConversionsSummaryModule,
  google_ads_clicks: GoogleAdsClicksModule,
  local_services_ads: LocalServicesAdsModule,
  backlinks: BacklinksModule,
  ai_insights: AIInsightsModule,
  notes: NotesModule,
  image_branding: ImageBrandingModule,
  full_report_section: LegacyFullReportSectionModule,
}

const preview = computed(() => previewByType[props.module.type])

const previewAnchorId = computed(() => (isBuilder.value ? undefined : `report-module-${props.module.id}`))

const tocChildProps = computed(() =>
  props.module.type === 'table_of_contents' ? { variant: props.variant } : {},
)
</script>

<template>
  <article
    :id="previewAnchorId"
    class="group relative scroll-mt-6 rounded-2xl border bg-white shadow-sm transition"
    :class="[
      isBuilder
        ? props.selected
          ? 'border-primary-400 ring-2 ring-primary-100'
          : 'border-surface-200 hover:border-surface-300'
        : 'border-transparent shadow-none',
      props.pageSlot ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : '',
      module.pageBreakBefore ? 'print:[break-before:page]' : '',
      !isBuilder ? 'print:break-inside-avoid' : '',
    ]"
    @click.self="isBuilder ? emit('select') : undefined"
  >
    <div v-if="isBuilder" class="flex shrink-0 items-start gap-2 border-b border-surface-100 px-4 py-3">
      <button
        type="button"
        class="module-drag-handle mt-0.5 cursor-grab rounded p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600 active:cursor-grabbing"
        aria-label="Drag to reorder"
        @click.stop
      >
        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm6-12a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </button>
      <div class="min-w-0 flex-1" @click="emit('select')">
        <h3 class="truncate text-sm font-semibold text-surface-900">{{ module.title }}</h3>
        <p class="text-[11px] font-medium uppercase tracking-wide text-surface-500">{{ moduleTypeLabel(module.type) }}</p>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          class="rounded-lg p-2 text-surface-500 hover:bg-surface-100 hover:text-surface-800"
          title="Settings"
          @click.stop="emit('edit')"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button
          type="button"
          class="rounded-lg p-2 text-surface-500 hover:bg-surface-100 hover:text-surface-800"
          title="Duplicate"
          @click.stop="emit('duplicate')"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9 9 0 019 9zM18.75 9.75h-9.75a1.125 1.125 0 00-1.125 1.125v9.75" />
          </svg>
        </button>
        <button
          type="button"
          class="rounded-lg p-2 text-surface-500 hover:bg-red-50 hover:text-red-600"
          title="Delete"
          @click.stop="emit('remove')"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
    <div v-else-if="module.type !== 'report_cover'" class="shrink-0 border-b border-surface-100 px-4 py-4 text-center">
      <h3 class="text-base font-semibold tracking-tight text-surface-900 sm:text-lg">{{ module.title }}</h3>
    </div>
    <div
      class="p-4"
      :class="pageSlot ? 'min-h-0 flex-1 overflow-hidden' : ''"
      @click="isBuilder ? emit('select') : undefined"
    >
      <component :is="preview" :module="module as never" v-bind="tocChildProps" />
    </div>
  </article>
</template>
