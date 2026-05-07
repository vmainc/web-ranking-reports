<script setup lang="ts">
import type { ReportModule, AIInsightsTone, ImageBrandingAlignment, GoogleAdsKpiKey } from '~/types/reportBuilder'
import { mergeGoogleAdsKpiVisibility } from '~/types/reportBuilder'
import { REPORT_SECTION_IDS, REPORT_SECTION_LABELS, type ReportSectionId } from '~/utils/reportLayoutPresets'

const props = defineProps<{
  module: ReportModule
}>()
const { module } = toRefs(props)

const emit = defineEmits<{
  updateTitle: [title: string]
  updateSettings: [patch: Record<string, unknown>]
  updatePageBreak: [value: boolean]
}>()

const dateOptions = [
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_28_days', label: 'Last 28 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'this_month', label: 'This month' },
]

const tones: { value: AIInsightsTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'concise', label: 'Concise' },
]

const alignments: { value: ImageBrandingAlignment; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]

function googleAdsKpiChecked(m: ReportModule, key: GoogleAdsKpiKey): boolean {
  if (m.type !== 'full_report_section') return true
  return mergeGoogleAdsKpiVisibility(m.settings.googleAdsKpis)[key]
}

function setGoogleAdsKpi(m: ReportModule, key: GoogleAdsKpiKey, checked: boolean) {
  if (m.type !== 'full_report_section') return
  emit('updateSettings', {
    googleAdsKpis: { ...mergeGoogleAdsKpiVisibility(m.settings.googleAdsKpis), [key]: checked },
  })
}

type RankKeywordOption = { id: string; keyword: string; position: number | null }

const pb = usePocketbase()
const siteIdRef = inject<Ref<string | null>>('reportBuilderSiteId', ref(null))
const rankKeywordOptions = ref<RankKeywordOption[]>([])
const rankKeywordsPending = ref(false)
const rankKeywordsError = ref('')
const rankKeywordsLoadedForSiteId = ref<string | null>(null)

const moduleRef = toRef(props, 'module')

function rankKeywordIncludeSet(m: ReportModule): Set<string> {
  if (m.type !== 'full_report_section') return new Set()
  return new Set((m.settings.rankKeywordIncludeIds ?? []).filter((id) => typeof id === 'string' && id.trim().length > 0))
}

function rankKeywordExcludeSet(m: ReportModule): Set<string> {
  if (m.type !== 'full_report_section') return new Set()
  return new Set((m.settings.rankKeywordExcludeIds ?? []).filter((id) => typeof id === 'string' && id.trim().length > 0))
}

function isIncluded(m: ReportModule, keywordId: string): boolean {
  return rankKeywordIncludeSet(m).has(keywordId)
}

function isExcluded(m: ReportModule, keywordId: string): boolean {
  return rankKeywordExcludeSet(m).has(keywordId)
}

function setIncluded(m: ReportModule, keywordId: string, checked: boolean) {
  if (m.type !== 'full_report_section') return
  const include = rankKeywordIncludeSet(m)
  const exclude = rankKeywordExcludeSet(m)
  if (checked) include.add(keywordId)
  else include.delete(keywordId)
  // explicit include wins; keep lists mutually consistent
  exclude.delete(keywordId)
  emit('updateSettings', {
    rankKeywordIncludeIds: [...include],
    rankKeywordExcludeIds: [...exclude],
  })
}

function setExcluded(m: ReportModule, keywordId: string, checked: boolean) {
  if (m.type !== 'full_report_section') return
  const include = rankKeywordIncludeSet(m)
  const exclude = rankKeywordExcludeSet(m)
  if (checked) exclude.add(keywordId)
  else exclude.delete(keywordId)
  include.delete(keywordId)
  emit('updateSettings', {
    rankKeywordIncludeIds: [...include],
    rankKeywordExcludeIds: [...exclude],
  })
}

function keepAllKeywords(m: ReportModule) {
  if (m.type !== 'full_report_section') return
  emit('updateSettings', { rankKeywordIncludeIds: [], rankKeywordExcludeIds: [] })
}

function keepOnlyTopKeywords(m: ReportModule, count = 10) {
  if (m.type !== 'full_report_section') return
  const ids = rankKeywordOptions.value.slice(0, count).map((k) => k.id)
  emit('updateSettings', { rankKeywordIncludeIds: ids, rankKeywordExcludeIds: [] })
}

async function loadRankKeywordOptions(siteId: string) {
  rankKeywordsPending.value = true
  rankKeywordsError.value = ''
  try {
    const token = pb.authStore.token
    const data = await $fetch<{ keywords?: Array<{ id?: string; keyword?: string; last_result_json?: { position?: number } | null }> }>(
      `/api/sites/${siteId}/rank-tracking/list`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        query: { skipBackfill: 1 },
      },
    )
    rankKeywordOptions.value = (data.keywords ?? [])
      .filter((row): row is { id: string; keyword: string; last_result_json?: { position?: number } | null } =>
        typeof row?.id === 'string' && typeof row.keyword === 'string' && row.keyword.trim().length > 0,
      )
      .map((row) => ({
        id: row.id,
        keyword: row.keyword,
        position:
          row.last_result_json && typeof row.last_result_json.position === 'number' ? row.last_result_json.position : null,
      }))
  } catch {
    rankKeywordOptions.value = []
    rankKeywordsError.value = 'Could not load tracked keywords for this site.'
  } finally {
    rankKeywordsPending.value = false
  }
}

watch(
  () => [moduleRef.value.type, moduleRef.value.type === 'full_report_section' ? moduleRef.value.settings.sectionId : '', siteIdRef.value] as const,
  async ([type, sectionId, siteId]) => {
    if (type !== 'full_report_section' || sectionId !== 'rank-tracking' || !siteId) return
    if (rankKeywordsLoadedForSiteId.value === siteId && rankKeywordOptions.value.length > 0) return
    rankKeywordsLoadedForSiteId.value = siteId
    await loadRankKeywordOptions(siteId)
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex flex-col gap-5">
    <div>
      <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Module</h2>
      <p class="mt-1 text-xs text-surface-500">Changes apply to the selected block immediately.</p>
    </div>

    <label class="block">
      <span class="text-xs font-medium text-surface-700">Block title</span>
      <input
        :value="module.title"
        type="text"
        class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        @input="emit('updateTitle', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <template v-if="module.type === 'report_cover'">
      <label class="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          :checked="module.settings.showLogo !== false"
          @change="emit('updateSettings', { showLogo: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Show logo on title page</span>
      </label>
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Cover logo URL (optional)</span>
        <input
          :value="module.settings.logoOverrideUrl ?? ''"
          type="url"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Leave blank to use report logo, then site logo"
          @input="emit('updateSettings', { logoOverrideUrl: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Tagline</span>
        <input
          :value="module.settings.tagline"
          type="text"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Optional · e.g. Agency name"
          @input="emit('updateSettings', { tagline: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <p class="text-[11px] leading-snug text-surface-500">
        Main title, subtitle, and default logo URL live in report settings. Clearing the override uses those next, then the site’s logo file if present.
      </p>
    </template>

    <template v-else-if="module.type === 'table_of_contents'">
      <label class="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          :checked="module.settings.showPageLabels"
          @change="emit('updateSettings', { showPageLabels: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Show page names next to each entry</span>
      </label>
    </template>

    <!-- Traffic overview -->
    <template v-else-if="module.type === 'traffic_overview'">
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Date range</span>
        <select
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          :value="module.settings.dateRange"
          @change="emit('updateSettings', { dateRange: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="o in dateOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.comparisonEnabled"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { comparisonEnabled: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Comparison period</span>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.showChart"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { showChart: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Show chart</span>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.showTotals"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { showTotals: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Show totals</span>
      </label>
    </template>

    <!-- Keyword rankings -->
    <template v-else-if="module.type === 'keyword_rankings'">
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Keyword group name</span>
        <input
          :value="module.settings.keywordGroupName"
          type="text"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @input="emit('updateSettings', { keywordGroupName: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Max keywords</span>
        <input
          :value="module.settings.maxKeywords"
          type="number"
          min="1"
          max="100"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @input="emit('updateSettings', { maxKeywords: Number(($event.target as HTMLInputElement).value) || 1 })"
        />
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.showChangeColumn"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { showChangeColumn: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Show change column</span>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.showCurrentRank"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { showCurrentRank: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Show current rank</span>
      </label>
    </template>

    <!-- Conversions -->
    <template v-else-if="module.type === 'conversions_summary'">
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Date range</span>
        <select
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          :value="module.settings.dateRange"
          @change="emit('updateSettings', { dateRange: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="o in dateOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.comparisonEnabled"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { comparisonEnabled: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Comparison period</span>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.showConversionValue"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { showConversionValue: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Show conversion value</span>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.showSourceBreakdown"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { showSourceBreakdown: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Show source breakdown</span>
      </label>
    </template>

    <!-- Google Ads clicks chart -->
    <template v-else-if="module.type === 'google_ads_clicks'">
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Date range</span>
        <select
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          :value="module.settings.rangePreset"
          @change="emit('updateSettings', { rangePreset: ($event.target as HTMLSelectElement).value })"
        >
          <option value="last_7_days">Last 7 days</option>
          <option value="last_28_days">Last 28 days</option>
          <option value="last_90_days">Last 90 days</option>
        </select>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.compareToPrevious"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { compareToPrevious: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Compare to previous period</span>
      </label>
      <p class="text-[11px] leading-snug text-surface-500">
        Uses the Google Ads account linked for this site. Daily clicks are summed across campaigns.
      </p>
    </template>

    <!-- AI insights -->
    <template v-else-if="module.type === 'ai_insights'">
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Summary text</span>
        <textarea
          :value="module.settings.body"
          rows="6"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @input="emit('updateSettings', { body: ($event.target as HTMLTextAreaElement).value })"
        />
      </label>
      <button
        type="button"
        class="w-full rounded-lg border border-dashed border-surface-300 px-3 py-2 text-xs font-semibold text-surface-600 hover:border-primary-300 hover:text-primary-700"
        disabled
      >
        Regenerate (coming soon)
      </button>
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Tone</span>
        <select
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          :value="module.settings.tone"
          @change="emit('updateSettings', { tone: ($event.target as HTMLSelectElement).value as AIInsightsTone })"
        >
          <option v-for="t in tones" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </label>
    </template>

    <!-- Notes -->
    <template v-else-if="module.type === 'notes'">
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Title</span>
        <input
          :value="module.settings.title"
          type="text"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @input="emit('updateSettings', { title: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Notes</span>
        <textarea
          :value="module.settings.body"
          rows="8"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @input="emit('updateSettings', { body: ($event.target as HTMLTextAreaElement).value })"
        />
      </label>
    </template>

    <!-- Image branding -->
    <template v-else-if="module.type === 'image_branding'">
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Image URL</span>
        <input
          :value="module.settings.imageUrl"
          type="url"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="https://…"
          @input="emit('updateSettings', { imageUrl: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Headline</span>
        <input
          :value="module.settings.headline"
          type="text"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @input="emit('updateSettings', { headline: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Subheadline</span>
        <input
          :value="module.settings.subheadline"
          type="text"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @input="emit('updateSettings', { subheadline: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Alignment</span>
        <select
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          :value="module.settings.alignment"
          @change="emit('updateSettings', { alignment: ($event.target as HTMLSelectElement).value as ImageBrandingAlignment })"
        >
          <option v-for="a in alignments" :key="a.value" :value="a.value">{{ a.label }}</option>
        </select>
      </label>
    </template>

    <template v-else-if="module.type === 'cloudflare'">
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.showChart"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { showChart: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Show mini chart (coming soon)</span>
      </label>
      <p class="text-[11px] leading-snug text-surface-500">Cloudflare module currently shows KPI stats from synced data.</p>
    </template>

    <!-- Classic full-report section -->
    <template v-else-if="module.type === 'full_report_section'">
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Section</span>
        <select
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          :value="module.settings.sectionId"
          @change="
            emit('updateSettings', {
              sectionId: ($event.target as HTMLSelectElement).value as ReportSectionId,
            })
          "
        >
          <option v-for="sid in REPORT_SECTION_IDS" :key="sid" :value="sid">{{ REPORT_SECTION_LABELS[sid] }}</option>
        </select>
      </label>
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Date range</span>
        <select
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          :value="module.settings.rangePreset"
          @change="emit('updateSettings', { rangePreset: ($event.target as HTMLSelectElement).value })"
        >
          <option value="last_7_days">Last 7 days</option>
          <option value="last_28_days">Last 28 days</option>
          <option value="last_90_days">Last 90 days</option>
        </select>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.compareToPrevious"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { compareToPrevious: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Compare to previous period</span>
      </label>
      <div v-if="module.settings.sectionId === 'google-ads'" class="space-y-2 rounded-lg border border-surface-100 bg-surface-50/80 p-3">
        <p class="text-xs font-medium text-surface-700">Google Ads metrics</p>
        <p class="text-[11px] leading-snug text-surface-500">Uncheck to hide a tile in the preview and PDF.</p>
        <label class="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            :checked="googleAdsKpiChecked(module, 'cost')"
            @change="setGoogleAdsKpi(module, 'cost', ($event.target as HTMLInputElement).checked)"
          />
          <span class="text-sm text-surface-800">Cost</span>
        </label>
        <label class="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            :checked="googleAdsKpiChecked(module, 'conversions')"
            @change="setGoogleAdsKpi(module, 'conversions', ($event.target as HTMLInputElement).checked)"
          />
          <span class="text-sm text-surface-800">Conversions</span>
        </label>
        <label class="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            :checked="googleAdsKpiChecked(module, 'clicks')"
            @change="setGoogleAdsKpi(module, 'clicks', ($event.target as HTMLInputElement).checked)"
          />
          <span class="text-sm text-surface-800">Clicks</span>
        </label>
        <label class="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            :checked="googleAdsKpiChecked(module, 'convRate')"
            @change="setGoogleAdsKpi(module, 'convRate', ($event.target as HTMLInputElement).checked)"
          />
          <span class="text-sm text-surface-800">Conv. rate</span>
        </label>
        <label class="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            :checked="googleAdsKpiChecked(module, 'impressions')"
            @change="setGoogleAdsKpi(module, 'impressions', ($event.target as HTMLInputElement).checked)"
          />
          <span class="text-sm text-surface-800">Impressions</span>
        </label>
        <label class="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            :checked="googleAdsKpiChecked(module, 'ctr')"
            @change="setGoogleAdsKpi(module, 'ctr', ($event.target as HTMLInputElement).checked)"
          />
          <span class="text-sm text-surface-800">CTR</span>
        </label>
      </div>
      <div
        v-if="module.settings.sectionId === 'rank-tracking'"
        class="space-y-3 rounded-lg border border-surface-100 bg-surface-50/80 p-3"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-medium text-surface-700">Rank tracking keywords</p>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded border border-surface-300 px-2 py-1 text-[11px] font-medium text-surface-700 hover:bg-surface-100"
              @click="keepAllKeywords(module)"
            >
              Keep all
            </button>
            <button
              type="button"
              class="rounded border border-surface-300 px-2 py-1 text-[11px] font-medium text-surface-700 hover:bg-surface-100"
              @click="keepOnlyTopKeywords(module, 10)"
            >
              Keep top 10
            </button>
          </div>
        </div>
        <p class="text-[11px] leading-snug text-surface-500">
          Use Include/Exclude to decide which tracked keywords appear in this report section.
        </p>
        <p v-if="rankKeywordsPending" class="text-xs text-surface-500">Loading tracked keywords…</p>
        <p v-else-if="rankKeywordsError" class="text-xs text-red-600">{{ rankKeywordsError }}</p>
        <p v-else-if="!rankKeywordOptions.length" class="text-xs text-surface-500">
          No tracked keywords found for this site.
        </p>
        <div v-else class="max-h-64 space-y-2 overflow-auto rounded border border-surface-200 bg-white p-2">
          <div
            v-for="kw in rankKeywordOptions"
            :key="kw.id"
            class="rounded border border-surface-100 px-2 py-1.5"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="truncate text-xs font-medium text-surface-800">{{ kw.keyword }}</p>
              <span class="shrink-0 text-[11px] text-surface-500">
                {{ kw.position ? `#${kw.position}` : '—' }}
              </span>
            </div>
            <div class="mt-1 flex items-center gap-4">
              <label class="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-surface-700">
                <input
                  type="checkbox"
                  class="h-3.5 w-3.5 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                  :checked="isIncluded(module, kw.id)"
                  @change="setIncluded(module, kw.id, ($event.target as HTMLInputElement).checked)"
                />
                Include
              </label>
              <label class="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-surface-700">
                <input
                  type="checkbox"
                  class="h-3.5 w-3.5 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                  :checked="isExcluded(module, kw.id)"
                  @change="setExcluded(module, kw.id, ($event.target as HTMLInputElement).checked)"
                />
                Exclude
              </label>
            </div>
          </div>
        </div>
      </div>
      <p class="text-[11px] leading-snug text-surface-500">
        Matches the classic full report widgets (GA, Ads, Lighthouse, Search Console, WooCommerce, audit, rank tracking,
        backlinks).
      </p>
    </template>

    <div class="border-t border-surface-100 pt-4">
      <label class="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          :checked="!!module.pageBreakBefore"
          @change="emit('updatePageBreak', ($event.target as HTMLInputElement).checked)"
        />
        <span class="text-sm text-surface-800">Start on a new page (PDF / print)</span>
      </label>
    </div>
  </div>
</template>
