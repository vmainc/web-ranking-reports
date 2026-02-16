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

      <div v-if="!googleStatus?.connected" class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p>Connect Google Analytics to see the dashboard.</p>
        <NuxtLink :to="`/sites/${site.id}`" class="mt-2 inline-block text-sm font-medium underline">
          Go to {{ site.name }} → Integrations
        </NuxtLink>
      </div>

      <section v-else-if="!hasGa" class="mb-10 rounded-xl border border-surface-200 bg-white p-6">
        <h2 class="mb-2 text-lg font-medium text-surface-900">Choose your GA4 property</h2>
        <p v-if="googleConnectedToast" class="mb-3 text-sm text-green-700">Google connected. Select a property below to load the dashboard.</p>
        <p v-else class="mb-3 text-sm text-surface-500">Select which Google Analytics 4 property to use for this site.</p>
        <p class="mb-4 text-sm text-surface-500">
          <button type="button" class="text-primary-600 hover:underline" :disabled="disconnecting" @click="handleDisconnect">Use a different Google account</button>
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <select
            v-model="propertySelectId"
            class="min-w-[200px] rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            :disabled="propertiesLoading"
          >
            <option value="">{{ propertiesLoading ? 'Loading properties…' : properties.length ? '— Select property —' : 'Load properties' }}</option>
            <option v-for="p in properties" :key="p.id" :value="p.id">{{ p.name }}{{ p.accountName ? ` (${p.accountName})` : '' }}</option>
          </select>
          <button
            v-if="!properties.length && !propertiesLoading"
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
            @click="loadProperties"
          >
            Load properties
          </button>
          <button
            v-else-if="propertySelectId"
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="propertySaving"
            @click="saveProperty"
          >
            {{ propertySaving ? 'Saving…' : 'Use this property' }}
          </button>
        </div>
        <p v-if="propertyError" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ propertyError }}</p>
        <p v-if="propertiesHint" class="mt-2 text-sm text-surface-600">{{ propertiesHint }}</p>
      </section>

      <template v-else>
        <div v-if="googleConnectedToast" class="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Google connected. Your dashboard is ready below.
        </div>
        <p class="mb-4 text-sm text-surface-500">
          Property: {{ googleStatus?.selectedProperty?.name ?? '' }}
          <button type="button" class="text-primary-600 hover:underline" :disabled="changingProperty || disconnecting" @click="handleChangeProperty">Change property</button>
          <span class="text-surface-400"> · </span>
          <button type="button" class="text-primary-600 hover:underline" :disabled="changingProperty || disconnecting" @click="handleDisconnect">Use a different Google account</button>
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
            <DashboardWidgetRetention
              v-else-if="w.id === 'retention'"
              :site-id="site.id"
              :range="rangePreset"
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
import { getApiErrorMessage } from '~/utils/apiError'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()
const site = ref<SiteRecord | null>(null)
const pending = ref(true)
const {
  getStatus,
  getProperties,
  selectProperty,
  clearProperty,
  disconnect,
} = useGoogleIntegration()
const googleStatus = ref<Awaited<ReturnType<typeof getStatus>> | null>(null)

const properties = ref<Array<{ id: string; name: string; accountName?: string }>>([])
const propertiesLoading = ref(false)
const propertiesHint = ref('')
const propertySelectId = ref('')
const propertySaving = ref(false)
const propertyError = ref('')
const changingProperty = ref(false)
const disconnecting = ref(false)

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

async function loadProperties() {
  if (!site.value) return
  propertiesLoading.value = true
  propertyError.value = ''
  propertiesHint.value = ''
  try {
    const res = await getProperties(site.value.id) as { properties?: Array<{ id: string; name: string; accountName?: string }>; hint?: string }
    properties.value = res.properties ?? []
    propertiesHint.value = res.hint ?? ''
    if (properties.value.length && !propertySelectId.value) propertySelectId.value = properties.value[0].id
  } catch (e) {
    propertyError.value = getApiErrorMessage(e)
  } finally {
    propertiesLoading.value = false
  }
}

async function saveProperty() {
  if (!site.value || !propertySelectId.value) return
  const p = properties.value.find((x) => x.id === propertySelectId.value)
  propertySaving.value = true
  propertyError.value = ''
  try {
    await selectProperty(site.value.id, propertySelectId.value, p?.name ?? propertySelectId.value)
    googleStatus.value = await getStatus(site.value.id).catch(() => null)
  } catch (e) {
    propertyError.value = e instanceof Error ? e.message : 'Failed to save property'
  } finally {
    propertySaving.value = false
  }
}

async function handleChangeProperty() {
  if (!site.value) return
  changingProperty.value = true
  try {
    await clearProperty(site.value.id)
    googleStatus.value = await getStatus(site.value.id).catch(() => null)
    properties.value = []
    propertySelectId.value = ''
    await loadProperties()
  } finally {
    changingProperty.value = false
  }
}

async function handleDisconnect() {
  if (!site.value) return
  disconnecting.value = true
  try {
    await disconnect(site.value.id)
    googleStatus.value = await getStatus(site.value.id).catch(() => null)
    properties.value = []
    propertySelectId.value = ''
  } finally {
    disconnecting.value = false
  }
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

watch(
  () => site.value && googleStatus.value?.connected && !googleStatus.value?.selectedProperty && !pending.value && properties.value.length === 0 && !propertiesLoading.value,
  (shouldLoad) => {
    if (shouldLoad) loadProperties()
  },
  { immediate: true }
)

onMounted(() => init())
watch(siteId, () => init())
</script>
