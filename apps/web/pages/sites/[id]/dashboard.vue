<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-surface-500">Loading…</p>
    </div>

    <template v-else-if="site">
      <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <NuxtLink
            :to="`/sites/${site.id}`"
            class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
          >
            ← {{ site.name }}
          </NuxtLink>
          <h1 class="text-2xl font-semibold text-surface-900">Analytics dashboard</h1>
          <p class="mt-1 text-sm text-surface-500">{{ site.domain }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <select
            v-model="rangePreset"
            class="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900"
            @change="saveLayoutDebounced"
          >
            <option value="last_7_days">Last 7 days</option>
            <option value="last_28_days">Last 28 days</option>
            <option value="last_90_days">Last 90 days</option>
          </select>
          <label class="flex items-center gap-2 text-sm text-surface-600">
            <input v-model="compareEnabled" type="checkbox" class="rounded" @change="saveLayoutDebounced" />
            Compare to previous period
          </label>
          <NuxtLink
            :to="`/sites/${site.id}/report?range=${rangePreset}&compare=${compareEnabled ? 'previous_period' : 'none'}`"
            class="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
          >
            Report view
          </NuxtLink>
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="exporting"
            @click="exportPdf(rangePreset, compareEnabled ? 'previous_period' : 'none')"
          >
            {{ exporting ? 'Exporting…' : 'Export PDF' }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
            @click="customizeOpen = true"
          >
            Customize dashboard
          </button>
        </div>
      </div>

      <div v-if="!hasGa" class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p>Connect Google Analytics and select a property to see the dashboard.</p>
        <NuxtLink :to="`/sites/${site.id}/analytics`" class="mt-2 inline-block text-sm font-medium underline">
          Go to Analytics →
        </NuxtLink>
      </div>

      <template v-else>
        <div
          v-if="googleConnectedToast"
          class="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          Google connected. <NuxtLink :to="`/sites/${site.id}/analytics`" class="font-medium underline">Select a GA4 property</NuxtLink> to see data.
        </div>
        <p class="mb-4 text-sm text-surface-500">
          Seeing zeros or errors?
          <NuxtLink :to="`/sites/${site.id}/analytics`" class="font-medium text-primary-600 hover:underline">Select a GA4 property</NuxtLink>
          and ensure it has data for the chosen date range.
        </p>
        <div class="space-y-6">
          <template v-for="w in enabledWidgets" :key="w.id">
            <DashboardWidgetKpiSummary
              v-if="w.id === 'kpi_summary'"
              :site-id="site.id"
              :range="rangePreset"
              :compare="compareEnabled ? 'previous_period' : 'none'"
              :subtitle="dateRangeSubtitle"
              @remove="removeWidget(w.id); saveLayout()"
              @move-up="moveWidget(w.id, 'up'); saveLayout()"
              @move-down="moveWidget(w.id, 'down'); saveLayout()"
            />
            <DashboardWidgetSessionsTrend
              v-else-if="w.id === 'sessions_trend'"
              :site-id="site.id"
              :range="rangePreset"
              :compare="compareEnabled ? 'previous_period' : 'none'"
              :subtitle="dateRangeSubtitle"
              @remove="removeWidget(w.id); saveLayout()"
              @move-up="moveWidget(w.id, 'up'); saveLayout()"
              @move-down="moveWidget(w.id, 'down'); saveLayout()"
            />
            <DashboardWidgetChannels
              v-else-if="w.id === 'traffic_channels'"
              :site-id="site.id"
              :range="rangePreset"
              :subtitle="dateRangeSubtitle"
              @remove="removeWidget(w.id); saveLayout()"
              @move-up="moveWidget(w.id, 'up'); saveLayout()"
              @move-down="moveWidget(w.id, 'down'); saveLayout()"
            />
            <DashboardWidgetCountries
              v-else-if="w.id === 'countries'"
              :site-id="site.id"
              :range="rangePreset"
              :limit="(w.settings?.limit as number) ?? 10"
              :subtitle="dateRangeSubtitle"
              @remove="removeWidget(w.id); saveLayout()"
              @move-up="moveWidget(w.id, 'up'); saveLayout()"
              @move-down="moveWidget(w.id, 'down'); saveLayout()"
            />
            <DashboardWidgetTopPages
              v-else-if="w.id === 'top_pages'"
              :site-id="site.id"
              :range="rangePreset"
              :limit="(w.settings?.limit as number) ?? 10"
              :subtitle="dateRangeSubtitle"
              @remove="removeWidget(w.id); saveLayout()"
              @move-up="moveWidget(w.id, 'up'); saveLayout()"
              @move-down="moveWidget(w.id, 'down'); saveLayout()"
            />
            <DashboardWidgetLandingPages
              v-else-if="w.id === 'landing_pages'"
              :site-id="site.id"
              :range="rangePreset"
              :limit="(w.settings?.limit as number) ?? 10"
              :subtitle="dateRangeSubtitle"
              @remove="removeWidget(w.id); saveLayout()"
              @move-up="moveWidget(w.id, 'up'); saveLayout()"
              @move-down="moveWidget(w.id, 'down'); saveLayout()"
            />
            <DashboardWidgetEvents
              v-else-if="w.id === 'events'"
              :site-id="site.id"
              :range="rangePreset"
              :limit="(w.settings?.limit as number) ?? 10"
              :subtitle="dateRangeSubtitle"
              @remove="removeWidget(w.id); saveLayout()"
              @move-up="moveWidget(w.id, 'up'); saveLayout()"
              @move-down="moveWidget(w.id, 'down'); saveLayout()"
            />
            <DashboardWidgetEcommerce
              v-else-if="w.id === 'ecommerce'"
              :site-id="site.id"
              :range="rangePreset"
              :subtitle="dateRangeSubtitle"
              @remove="removeWidget(w.id); saveLayout()"
              @move-up="moveWidget(w.id, 'up'); saveLayout()"
              @move-down="moveWidget(w.id, 'down'); saveLayout()"
            />
          </template>
        </div>
      </template>

      <!-- Customize panel -->
      <Teleport to="body">
        <div
          v-if="customizeOpen"
          class="fixed inset-0 z-40 flex"
        >
          <div class="bg-surface-900/50 flex-1" @click="customizeOpen = false" />
          <div class="w-full max-w-md border-l border-surface-200 bg-white shadow-xl">
            <div class="flex items-center justify-between border-b border-surface-200 px-4 py-3">
              <h2 class="text-lg font-semibold text-surface-900">Customize dashboard</h2>
              <button type="button" class="rounded p-1 text-surface-500 hover:bg-surface-100" @click="customizeOpen = false">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div class="max-h-[80vh] overflow-y-auto p-4">
              <p class="mb-4 text-sm text-surface-500">Toggle widgets and use Reset to restore defaults.</p>
              <div class="space-y-2">
                <div
                  v-for="w in layout?.widgets ?? []"
                  :key="w.id"
                  class="flex items-center justify-between rounded-lg border border-surface-200 px-3 py-2"
                >
                  <span class="font-medium text-surface-900">{{ WIDGET_LABELS[w.id] ?? w.id }}</span>
                  <label class="flex items-center gap-2">
                    <input v-model="w.enabled" type="checkbox" class="rounded" @change="saveLayout()" />
                  </label>
                </div>
              </div>
              <button
                type="button"
                class="mt-6 w-full rounded-lg border border-surface-200 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
                @click="resetToDefaults(); saveLayout()"
              >
                Reset to defaults
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>

    <div v-else class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-primary-600 hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import { getSite } from '~/services/sites'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'
import { useDashboardSettings } from '~/composables/useDashboardSettings'
import { useExportPdf } from '~/composables/useExportPdf'
import { WIDGET_LABELS } from '~/utils/dashboardLayout'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()
const site = ref<SiteRecord | null>(null)
const pending = ref(true)
const { getStatus } = useGoogleIntegration()
const googleStatus = ref<Awaited<ReturnType<typeof getStatus>> | null>(null)

const {
  layout,
  enabledWidgets,
  load: loadSettings,
  save: saveLayout,
  setWidgetEnabled: setWidgetEnabledImpl,
  moveWidget,
  resetToDefaults,
} = useDashboardSettings(siteId)
const { exportPdf, exporting } = useExportPdf(siteId)

const rangePreset = ref('last_28_days')
const compareEnabled = ref(true)
const customizeOpen = ref(false)
const googleConnectedToast = ref(false)

const hasGa = computed(() => googleStatus.value?.connected && googleStatus.value?.selectedProperty)

const dateRangeSubtitle = computed(() => {
  const r = rangePreset.value
  const c = compareEnabled.value ? ' (vs previous period)' : ''
  if (r === 'last_7_days') return 'Last 7 days' + c
  if (r === 'last_28_days') return 'Last 28 days' + c
  if (r === 'last_90_days') return 'Last 90 days' + c
  return r + c
})

function removeWidget(widgetId: string) {
  setWidgetEnabledImpl(widgetId as import('~/utils/dashboardLayout').WidgetId, false)
}

watch([rangePreset, compareEnabled], () => {
  if (layout.value) {
    layout.value.dateRange = { preset: rangePreset.value }
    layout.value.compareTo = { ...layout.value.compareTo, enabled: compareEnabled.value }
  }
})

let saveTimeout: ReturnType<typeof setTimeout> | null = null
function saveLayoutDebounced() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveLayout()
    saveTimeout = null
  }, 300)
}

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
    if (site.value) {
      googleStatus.value = await getStatus(site.value.id).catch(() => null)
      await loadSettings()
      if (layout.value?.dateRange?.preset) rangePreset.value = layout.value.dateRange.preset
      if (layout.value?.compareTo) compareEnabled.value = !!layout.value.compareTo.enabled
      if (route.query.google === 'connected') {
        googleConnectedToast.value = true
        if (typeof window !== 'undefined') window.history.replaceState({}, '', route.path)
        await getStatus(site.value.id).then((s) => { googleStatus.value = s }).catch(() => null)
        setTimeout(() => { googleConnectedToast.value = false }, 8000)
      }
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>
