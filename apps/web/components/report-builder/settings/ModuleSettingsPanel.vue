<script setup lang="ts">
import type { ReportModule, AIInsightsTone, ImageBrandingAlignment, GoogleAdsKpiKey } from '~/types/reportBuilder'
import type { Report, SiteRecord } from '~/types'
import { mergeGoogleAdsKpiVisibility } from '~/types/reportBuilder'
import { filterReportableRankKeywords } from '~/utils/rankKeywordReport'
import { REPORT_SECTION_IDS, REPORT_SECTION_LABELS, type ReportSectionId } from '~/utils/reportLayoutPresets'
import { updateSiteLogo } from '~/services/sites'
import { resolveSiteLogoUrl } from '~/utils/siteLogoUrl'
import { WRR_LOGO_PUBLIC_PATH } from '~/utils/wrrReportBranding'

const props = defineProps<{
  module: ReportModule
}>()
const { module } = toRefs(props)

const emit = defineEmits<{
  updateTitle: [title: string]
  updateSettings: [patch: Record<string, unknown>]
  updatePageBreak: [value: boolean]
}>()

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
const reportPreviewSite = inject<Ref<SiteRecord | null>>('reportPreviewSite', ref(null))
const reportWorkspaceOwnerPlan = inject<Ref<Report['workspaceOwnerPlan'] | null>>('reportWorkspaceOwnerPlan', ref(null))
const rankKeywordOptions = ref<RankKeywordOption[]>([])
const rankKeywordsPending = ref(false)
const rankKeywordsError = ref('')
const rankKeywordsLoadedForSiteId = ref<string | null>(null)

const moduleRef = toRef(props, 'module')
const coverLogoUploading = ref(false)
const coverLogoError = ref('')
const coverLogoSuccess = ref(false)
const coverLogoInput = ref<HTMLInputElement | null>(null)
const coverLogoUrl = computed(() => resolveSiteLogoUrl(reportPreviewSite.value, pb))
const freeWorkspaceCoverBranding = computed(() => reportWorkspaceOwnerPlan.value === 'free')

async function onCoverLogoChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  coverLogoError.value = ''
  coverLogoSuccess.value = false
  if (!file) return
  const sid = siteIdRef.value
  if (!sid) {
    coverLogoError.value = 'Select a site for this report before uploading a logo.'
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    coverLogoError.value = 'File must be under 2MB.'
    return
  }
  coverLogoUploading.value = true
  try {
    const updated = await updateSiteLogo(pb, sid, file)
    reportPreviewSite.value = updated
    coverLogoSuccess.value = true
    if (coverLogoInput.value) coverLogoInput.value.value = ''
    setTimeout(() => {
      coverLogoSuccess.value = false
    }, 2500)
  } catch (err: unknown) {
    const data = err && typeof err === 'object' && 'data' in err ? (err as { data?: { message?: string } }).data : undefined
    coverLogoError.value =
      typeof data?.message === 'string'
        ? data.message
        : err instanceof Error
          ? err.message
          : 'Could not upload logo.'
  } finally {
    coverLogoUploading.value = false
  }
}

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
    rankKeywordOptions.value = filterReportableRankKeywords(data.keywords ?? [])
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
        <span class="text-xs font-medium text-surface-700">Site logo</span>
        <template v-if="freeWorkspaceCoverBranding">
          <div class="mt-1 flex items-center gap-3">
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-surface-200 bg-surface-50 p-1"
            >
              <img :src="WRR_LOGO_PUBLIC_PATH" alt="" class="h-full w-full object-contain" />
            </div>
            <p class="text-[11px] leading-snug text-surface-600">
              Free plan reports always show Web Ranking Reports on the cover. Upgrade the workspace to use a client or site logo on exported reports.
            </p>
          </div>
        </template>
        <template v-else>
        <div class="mt-1 flex items-center gap-3">
          <div
            v-if="coverLogoUrl"
            class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-surface-200 bg-surface-50"
          >
            <img :src="coverLogoUrl" alt="Site logo" class="h-full w-full object-contain" />
          </div>
          <div v-else class="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-dashed border-surface-300 bg-surface-50 text-[10px] text-surface-500">
            No logo
          </div>
          <input
            ref="coverLogoInput"
            type="file"
            accept="image/*"
            class="block w-full text-xs text-surface-600 file:mr-2 file:rounded-md file:border-0 file:bg-primary-50 file:px-2 file:py-1 file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            :disabled="coverLogoUploading || !siteIdRef"
            @change="onCoverLogoChange"
          />
        </div>
        <p v-if="coverLogoUploading" class="mt-1 text-[11px] text-surface-500">Uploading…</p>
        <p v-else-if="coverLogoError" class="mt-1 text-[11px] text-red-600">{{ coverLogoError }}</p>
        <p v-else-if="coverLogoSuccess" class="mt-1 text-[11px] text-green-600">Logo updated for this site.</p>
        <p class="mt-1 text-[11px] text-surface-500">This updates the same logo used in Site Settings.</p>
        </template>
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
      <p class="text-[11px] leading-snug text-surface-500">Main title/subtitle live in report settings. Site logo is the cover logo source.</p>
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

    <!-- Backlink profile (DataForSEO) -->
    <template v-else-if="module.type === 'backlinks'">
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.autoRefresh"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { autoRefresh: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Refresh from DataForSEO when needed</span>
      </label>
      <label v-if="module.settings.autoRefresh" class="block">
        <span class="text-xs font-medium text-surface-700">Refresh if cache older than (days)</span>
        <input
          type="number"
          min="1"
          max="365"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          :value="module.settings.maxAgeDays"
          @change="
            emit('updateSettings', {
              maxAgeDays: Math.min(365, Math.max(1, Number(($event.target as HTMLInputElement).value) || 30)),
            })
          "
        />
      </label>
      <p class="text-[11px] leading-snug text-surface-500">
        Uses the same DataForSEO credentials as rank tracking. Each full refresh runs five live API requests.
      </p>
    </template>

    <!-- Local Service Ads summary -->
    <template v-else-if="module.type === 'local_services_ads'">
      <p class="text-[11px] leading-snug text-surface-500">
        Uses the Local Service Ads account linked for this site (same data as the site’s LSA page).
      </p>
    </template>

    <!-- Google Ads clicks chart -->
    <template v-else-if="module.type === 'google_ads_clicks'">
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
          Only keywords with a current ranking appear on reports. Use Include/Exclude to narrow which ranked keywords show in this section.
        </p>
        <p v-if="rankKeywordsPending" class="text-xs text-surface-500">Loading tracked keywords…</p>
        <p v-else-if="rankKeywordsError" class="text-xs text-red-600">{{ rankKeywordsError }}</p>
        <p v-else-if="!rankKeywordOptions.length" class="text-xs text-surface-500">
          No ranked keywords found for this site yet.
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
