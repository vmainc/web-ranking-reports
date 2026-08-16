<template>
  <SiteIntegrationShell max-width="7xl">
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
        <h1 class="text-2xl font-semibold text-surface-900">Social Connections</h1>
        <p class="mt-1 text-sm text-surface-500">
          Track this site’s Facebook Page and include social performance in reports.
        </p>
      </div>

      <p v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{{ error }}</p>
      <p v-if="notice" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{{ notice }}</p>

      <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-surface-900">
              Facebook
              <span v-if="facebook?.connectedThroughMeta" class="text-emerald-600">✓</span>
            </h2>
            <p class="mt-1 text-sm text-surface-500">
              Instagram and other networks can be added later using the same connection model.
            </p>
          </div>
        </div>

        <div v-if="!facebook" class="mt-5">
          <p class="text-sm text-surface-600">
            Track this site’s Facebook Page and include social performance in reports.
          </p>
          <form class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="startTracking">
            <div class="min-w-0 flex-1">
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-surface-500">Facebook Page URL</label>
              <input
                v-model="pageUrl"
                type="text"
                class="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
                placeholder="https://www.facebook.com/yourpage"
              />
            </div>
            <button
              type="submit"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
              :disabled="saving || !pageUrl.trim()"
            >
              {{ saving ? 'Adding…' : 'Start Tracking' }}
            </button>
          </form>
        </div>

        <div v-else class="mt-5 space-y-4">
          <div>
            <p class="text-base font-medium text-surface-900">{{ facebook.displayName || 'Facebook Page' }}</p>
            <p v-if="facebook.canonicalUrl" class="text-sm text-surface-500">{{ displayHost(facebook.canonicalUrl) }}</p>
          </div>

          <p
            v-if="facebook.status === 'reconnect_required' || meta.reconnectRequired"
            class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            Meta authorization has expired.
            <NuxtLink to="/agency?tab=integrations" class="font-medium text-primary-700 hover:underline">Reconnect Meta</NuxtLink>
          </p>

          <p v-else-if="facebook.connectedThroughMeta" class="text-sm text-emerald-800">Connected through Meta</p>
          <p v-else class="text-sm text-surface-600">
            Public Tracking
            <span v-if="!publicProviderAvailable" class="block mt-1 text-surface-500">
              Public metric collection is not currently available for this Page. Connect Meta for deeper Page insights.
            </span>
          </p>

          <p v-if="facebook.lastSyncedAt" class="text-xs text-surface-500">
            Last synced: {{ formatWhen(facebook.lastSyncedAt) }}
          </p>

          <div class="flex flex-wrap gap-2">
            <button
              v-if="facebook.accessType === 'authenticated'"
              type="button"
              class="rounded-lg border border-primary-600 bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50"
              :disabled="refreshing"
              @click="refresh"
            >
              {{ refreshing ? 'Refreshing…' : 'Refresh' }}
            </button>
            <NuxtLink
              v-if="!facebook.connectedThroughMeta"
              to="/agency?tab=integrations"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
            >
              Connect Meta for Deeper Insights
            </NuxtLink>
            <NuxtLink
              v-else
              to="/agency?tab=integrations"
              class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
            >
              Manage
            </NuxtLink>
            <button
              type="button"
              class="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              :disabled="removing"
              @click="removeConnection"
            >
              {{ removing ? 'Removing…' : 'Remove' }}
            </button>
          </div>
        </div>
      </section>
    </template>
  </SiteIntegrationShell>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import { getSite } from '~/services/sites'

definePageMeta({ layout: 'default' })

const route = useRoute()
const pb = usePocketbase()
const siteId = computed(() => route.params.id as string)
const site = ref<SiteRecord | null>(null)
const pending = ref(true)
const saving = ref(false)
const refreshing = ref(false)
const removing = ref(false)
const error = ref('')
const notice = ref('')
const pageUrl = ref('')
const publicProviderAvailable = ref(false)

type FacebookConn = {
  id: string
  displayName: string
  canonicalUrl: string
  username: string
  accessType: string
  status: string
  lastSyncedAt: string
  connectedThroughMeta: boolean
}

const facebook = ref<FacebookConn | null>(null)
const meta = ref<{ connected: boolean; reconnectRequired: boolean }>({ connected: false, reconnectRequired: false })

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function displayHost(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/+$/, '')
}

function formatWhen(iso: string) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Today'
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso.slice(0, 10)
  }
}

async function load() {
  error.value = ''
  try {
    const res = await $fetch<{
      facebook: FacebookConn | null
      meta: { connected: boolean; reconnectRequired: boolean }
      publicProviderAvailable: boolean
    }>(`/api/sites/${siteId.value}/social/connections`, { headers: authHeaders() })
    facebook.value = res.facebook
    meta.value = res.meta
    publicProviderAvailable.value = res.publicProviderAvailable
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Failed to load social connections.'
  }
}

async function startTracking() {
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    const res = await $fetch<{
      publicMetricsAvailable: boolean
      publicMetricsUnavailableReason?: string
    }>(`/api/sites/${siteId.value}/social/facebook/resolve`, {
      method: 'POST',
      headers: authHeaders(),
      body: { url: pageUrl.value },
    })
    await load()
    if (res.publicMetricsAvailable) {
      notice.value = 'Facebook Page added. Public metrics are being tracked.'
    } else {
      notice.value = 'Facebook Page added. Public metric collection is not currently available for this Page. Connect Meta for deeper Page insights.'
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Could not add that Facebook Page.'
  } finally {
    saving.value = false
  }
}

async function refresh() {
  if (!facebook.value) return
  refreshing.value = true
  error.value = ''
  try {
    await $fetch(`/api/sites/${siteId.value}/social/connections/${facebook.value.id}/refresh`, {
      method: 'POST',
      headers: authHeaders(),
    })
    await load()
    notice.value = 'Facebook metrics refreshed from stored Insights sync.'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Refresh failed.'
  } finally {
    refreshing.value = false
  }
}

async function removeConnection() {
  if (!facebook.value) return
  removing.value = true
  try {
    await $fetch(`/api/sites/${siteId.value}/social/connections/${facebook.value.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    facebook.value = null
    notice.value = 'Facebook connection removed. Historical snapshots are kept.'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Could not remove connection.'
  } finally {
    removing.value = false
  }
}

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
    if (site.value) await load()
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>
