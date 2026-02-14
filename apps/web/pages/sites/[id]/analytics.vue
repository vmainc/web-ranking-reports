<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-surface-500">Loading…</p>
    </div>

    <template v-else-if="site">
      <div class="mb-8">
        <NuxtLink
          :to="`/sites/${site.id}`"
          class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
        >
          ← {{ site.name }}
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-surface-900">Google Analytics</h1>
        <p class="mt-1 text-sm text-surface-500">Choose a property and view reports for this site.</p>
      </div>

      <div
        v-if="googleConnectedToast"
        class="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
      >
        Google connected successfully. Select a GA4 property below to view reports.
      </div>

      <!-- Not connected -->
      <div
        v-if="googleStatus && !googleStatus.connected"
        class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800"
      >
        <p class="font-medium">Google Analytics is not connected for this site.</p>
        <p class="mt-1 text-sm">Connect Google from the Integrations section on the site page to enable reports.</p>
        <NuxtLink :to="`/sites/${site.id}`" class="mt-4 inline-block text-sm font-medium underline">
          Go to {{ site.name }} →
        </NuxtLink>
      </div>

      <!-- Property selection (connected, no property yet) -->
      <section v-else-if="googleStatus?.connected && !googleStatus?.selectedProperty" class="mb-10">
        <h2 class="mb-2 text-lg font-medium text-surface-900">Choose your GA4 property</h2>
        <p class="mb-4 text-sm text-surface-500">
          Select which Google Analytics 4 property to use for reports. We’ll load your properties from Google.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <select
            v-model="propertySelectId"
            class="min-w-[200px] rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            :disabled="propertiesLoading"
          >
            <option value="">
              {{ propertiesLoading ? 'Loading properties…' : properties.length ? '— Select property —' : 'Click Load properties' }}
            </option>
            <option v-for="p in properties" :key="p.id" :value="p.id">
              {{ p.name }}{{ p.accountName ? ` (${p.accountName})` : '' }}
            </option>
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
        <p v-if="propertiesHint" class="mt-2 text-sm text-surface-600">{{ propertiesHint }}</p>
        <p v-if="propertyError" class="mt-2 text-sm text-red-600">{{ propertyError }}</p>
      </section>

      <!-- Reports (property selected) -->
      <template v-else-if="googleStatus?.connected && googleStatus?.selectedProperty">
        <section class="mb-8 rounded-xl border border-surface-200 bg-white p-6">
          <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-medium text-surface-900">Report</h2>
              <p class="mt-0.5 text-sm text-surface-500">
                Property: {{ googleStatus.selectedProperty.name }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <input
                v-model="reportStart"
                type="date"
                class="rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <span class="text-surface-500">to</span>
              <input
                v-model="reportEnd"
                type="date"
                class="rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <button
                type="button"
                class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
                :disabled="reportLoading"
                @click="loadReport"
              >
                {{ reportLoading ? 'Loading…' : 'Load report' }}
              </button>
            </div>
          </div>
          <p v-if="reportError" class="mb-4 text-sm text-red-600">{{ reportError }}</p>

          <div v-if="reportSummary" class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div class="rounded-xl border border-surface-200 bg-surface-50 p-5">
              <p class="text-sm font-medium text-surface-500">Users</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">{{ reportSummary.activeUsers.toLocaleString() }}</p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-surface-50 p-5">
              <p class="text-sm font-medium text-surface-500">Sessions</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">{{ reportSummary.sessions.toLocaleString() }}</p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-surface-50 p-5">
              <p class="text-sm font-medium text-surface-500">Page views</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">{{ reportSummary.screenPageViews.toLocaleString() }}</p>
            </div>
            <div class="rounded-xl border border-surface-200 bg-surface-50 p-5">
              <p class="text-sm font-medium text-surface-500">Engagement rate</p>
              <p class="mt-1 text-2xl font-semibold text-surface-900">
                {{ reportSummary.sessions > 0 ? ((reportSummary.screenPageViews / reportSummary.sessions) * 100).toFixed(1) : 0 }}%
              </p>
            </div>
          </div>

          <div v-if="reportRows.length" class="overflow-x-auto rounded-lg border border-surface-200">
            <table class="min-w-full divide-y divide-surface-200 text-left text-sm">
              <thead class="bg-surface-50">
                <tr>
                  <th class="px-4 py-3 font-medium text-surface-700">Date</th>
                  <th class="px-4 py-3 font-medium text-surface-700">Users</th>
                  <th class="px-4 py-3 font-medium text-surface-700">Sessions</th>
                  <th class="px-4 py-3 font-medium text-surface-700">Page views</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-200">
                <tr v-for="row in reportRows" :key="row.date" class="hover:bg-surface-50">
                  <td class="px-4 py-2 font-medium text-surface-900">{{ row.date }}</td>
                  <td class="px-4 py-2 text-surface-600">{{ row.activeUsers.toLocaleString() }}</td>
                  <td class="px-4 py-2 text-surface-600">{{ row.sessions.toLocaleString() }}</td>
                  <td class="px-4 py-2 text-surface-600">{{ row.screenPageViews.toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else-if="!reportLoading && !reportError" class="py-6 text-center text-sm text-surface-500">
            Select a date range and click Load report to see data.
          </p>
        </section>
      </template>
    </template>

    <div v-else class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-primary-600 hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord, IntegrationRecord, IntegrationProvider } from '~/types'
import type { GoogleStatusResponse } from '~/composables/useGoogleIntegration'
import { getSite } from '~/services/sites'
import { listIntegrationsBySite, getProviderList } from '~/services/integrations'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)

const pb = usePocketbase()
const { getStatus, getProperties, selectProperty, getReport } = useGoogleIntegration()
const site = ref<SiteRecord | null>(null)
const integrations = ref<IntegrationRecord[]>([])
const googleStatus = ref<GoogleStatusResponse | null>(null)
const googleConnectedToast = ref(false)
const pending = ref(true)

const properties = ref<Array<{ id: string; name: string; accountName?: string }>>([])
const propertiesLoading = ref(false)
const propertiesHint = ref('')
const propertySelectId = ref('')
const propertySaving = ref(false)
const propertyError = ref('')

function defaultReportStart(): string {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}
const reportStart = ref(defaultReportStart())
const reportEnd = ref(new Date().toISOString().slice(0, 10))
const reportLoading = ref(false)
const reportError = ref('')
const reportSummary = ref<{ activeUsers: number; sessions: number; screenPageViews: number } | null>(null)
const reportRows = ref<Array<{ date: string; activeUsers: number; sessions: number; screenPageViews: number }>>([])

const providerList = getProviderList()

function integrationByProvider(provider: IntegrationProvider): IntegrationRecord | undefined {
  return integrations.value.find((i) => i.provider === provider)
}

async function loadSite() {
  const s = await getSite(pb, siteId.value)
  site.value = s
}

async function loadIntegrations() {
  if (!site.value) return
  integrations.value = await listIntegrationsBySite(pb, site.value.id)
}

async function loadGoogleStatus() {
  if (!site.value) return
  try {
    googleStatus.value = await getStatus(site.value.id)
  } catch {
    googleStatus.value = null
  }
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
    if (properties.value.length && !propertySelectId.value) {
      propertySelectId.value = properties.value[0].id
    }
  } catch (e) {
    propertyError.value = e instanceof Error ? e.message : 'Failed to load properties'
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
    await loadGoogleStatus()
  } catch (e) {
    propertyError.value = e instanceof Error ? e.message : 'Failed to save property'
  } finally {
    propertySaving.value = false
  }
}

async function loadReport() {
  if (!site.value) return
  reportLoading.value = true
  reportError.value = ''
  reportSummary.value = null
  reportRows.value = []
  try {
    const res = await getReport(site.value.id, reportStart.value, reportEnd.value)
    reportSummary.value = res.summary ?? null
    reportRows.value = res.rows ?? []
  } catch (e) {
    reportError.value = e instanceof Error ? e.message : 'Failed to load report'
  } finally {
    reportLoading.value = false
  }
}

async function init() {
  pending.value = true
  try {
    await loadSite()
    await Promise.all([loadIntegrations(), loadGoogleStatus()])
    if (route.query.google === 'connected') {
      googleConnectedToast.value = true
      if (typeof window !== 'undefined') window.history.replaceState({}, '', route.path)
      setTimeout(() => { googleConnectedToast.value = false }, 8000)
      await loadGoogleStatus()
      if (googleStatus.value?.connected && !googleStatus.value?.selectedProperty) {
        await loadProperties()
      }
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>
