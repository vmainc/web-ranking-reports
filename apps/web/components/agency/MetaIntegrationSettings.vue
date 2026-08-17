<template>
  <section class="mb-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-surface-900">Meta</h2>
        <p class="mt-1 text-sm text-surface-500">
          Connect Facebook Pages and access Page Insights. One workspace connection can be mapped to multiple sites.
        </p>
      </div>
      <span
        class="rounded-full px-2.5 py-0.5 text-xs font-medium"
        :class="statusPillClass"
      >
        {{ statusLabel }}
      </span>
    </div>

    <p v-if="!isOwner && workspaceRole !== null" class="mt-4 text-sm text-surface-500">
      Only the workspace owner can connect Meta.
    </p>

    <div v-else-if="loading" class="mt-4 text-sm text-surface-500">Loading…</div>

    <div v-else class="mt-5 space-y-5">
      <p
        v-if="banner"
        class="rounded-lg border px-4 py-3 text-sm"
        :class="banner.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'"
      >
        {{ banner.text }}
      </p>

      <p
        v-if="integration.reconnectRequired"
        class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        Meta needs to be reconnected to continue collecting Facebook Insights.
      </p>

      <p v-if="!configured || !encryptionConfigured" class="text-xs text-amber-700">
        Server configuration incomplete
        <template v-if="!configured"> (META_APP_ID / META_APP_SECRET)</template>
        <template v-if="!encryptionConfigured"> (encryption key)</template>.
      </p>

      <dl v-if="integration.connected || integration.reconnectRequired" class="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-surface-500">Account</dt>
          <dd class="font-medium text-surface-900">{{ integration.displayName || '—' }}</dd>
        </div>
        <div>
          <dt class="text-surface-500">Available Facebook Pages</dt>
          <dd class="font-medium text-surface-900">{{ pageCountLabel }}</dd>
        </div>
      </dl>

      <div class="flex flex-wrap gap-2">
        <button
          v-if="!integration.connected"
          type="button"
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
          :disabled="connecting || !configured || !encryptionConfigured"
          @click="connectMeta"
        >
          {{ connecting ? 'Redirecting…' : integration.reconnectRequired ? 'Reconnect Meta' : 'Connect Meta' }}
        </button>
        <template v-else>
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="loadingPages"
            @click="loadPages"
          >
            {{ loadingPages ? 'Loading…' : 'Manage Pages' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
            :disabled="connecting"
            @click="connectMeta"
          >
            Reconnect
          </button>
          <button
            type="button"
            class="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            :disabled="disconnecting"
            @click="confirmDisconnect = true"
          >
            Disconnect
          </button>
        </template>
      </div>

      <div v-if="pagesLoaded" class="space-y-3">
        <h3 class="text-sm font-semibold text-surface-900">Facebook Pages</h3>
        <p class="text-xs text-surface-500">
          {{ pages.length }} Facebook Page{{ pages.length === 1 ? '' : 's' }} from Meta.
          {{ sites.length }} WRR site{{ sites.length === 1 ? '' : 's' }} available to map.
          If a Page is missing, use Reconnect and select every Page you manage.
        </p>
        <input
          v-if="pages.length"
          v-model="pageFilter"
          type="search"
          class="w-full max-w-md rounded-lg border border-surface-300 px-3 py-1.5 text-sm"
          placeholder="Filter Facebook Pages…"
        />
        <p v-if="pageError" class="text-sm text-red-600">{{ pageError }}</p>
        <p v-else-if="!pages.length" class="text-sm text-surface-500">
          No Facebook Pages were returned for this account.
        </p>
        <p v-else-if="!visiblePages.length" class="text-sm text-surface-500">No Pages match that filter.</p>
        <ul v-else class="divide-y divide-surface-100 rounded-lg border border-surface-200">
          <li v-for="page in visiblePages" :key="page.id" class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p class="text-sm font-medium text-surface-900">{{ page.name }}</p>
              <p class="text-xs text-surface-500">
                Mapped site: {{ page.mappedSiteName || '—' }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <select
                v-if="!page.mappedSiteId"
                class="max-w-xs rounded-lg border border-surface-300 px-2 py-1.5 text-sm"
                :value="pendingSite[page.id] || ''"
                @change="pendingSite[page.id] = ($event.target as HTMLSelectElement).value"
              >
                <option value="">Select site</option>
                <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name || s.domain }}</option>
              </select>
              <button
                v-if="!page.mappedSiteId"
                type="button"
                class="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
                :disabled="!pendingSite[page.id] || mappingId === page.id"
                @click="mapPage(page.id)"
              >
                {{ mappingId === page.id ? 'Connecting…' : 'Connect' }}
              </button>
              <template v-else>
                <span class="text-xs font-medium text-emerald-700">Connected</span>
                <button
                  type="button"
                  class="rounded-lg border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-50 disabled:opacity-50"
                  :disabled="unmappingId === page.mappedConnectionId"
                  @click="unmapPage(page.mappedConnectionId)"
                >
                  Remove mapping
                </button>
              </template>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="confirmDisconnect"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="confirmDisconnect = false"
      >
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
          <h3 class="text-lg font-semibold text-surface-900">Disconnect Meta?</h3>
          <p class="mt-2 text-sm text-surface-600">
            Page Insights collection will stop until you reconnect. Historical snapshots are kept.
          </p>
          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm" @click="confirmDisconnect = false">
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              :disabled="disconnecting"
              @click="disconnectMeta"
            >
              {{ disconnecting ? 'Disconnecting…' : 'Disconnect' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  isOwner: boolean
  workspaceRole: string | null
  authHeaders: () => Record<string, string>
}>()

const route = useRoute()
const router = useRouter()

type IntegrationDto = {
  connected: boolean
  status: string
  displayName: string
  lastVerifiedAt: string
  reconnectRequired: boolean
  lastError?: string
}

type MetaPageRow = {
  id: string
  name: string
  username: string
  link: string
  mappedSiteId: string
  mappedSiteName: string
  mappedConnectionId: string
}

const loading = ref(true)
const connecting = ref(false)
const disconnecting = ref(false)
const confirmDisconnect = ref(false)
const loadingPages = ref(false)
const pagesLoaded = ref(false)
const pageError = ref('')
const mappingId = ref('')
const unmappingId = ref('')
const configured = ref(false)
const encryptionConfigured = ref(false)
const pageCount = ref<number | null>(null)
const integration = ref<IntegrationDto>({
  connected: false,
  status: 'disconnected',
  displayName: '',
  lastVerifiedAt: '',
  reconnectRequired: false,
})
const pages = ref<MetaPageRow[]>([])
const sites = ref<Array<{ id: string; name: string; domain: string }>>([])
const pendingSite = reactive<Record<string, string>>({})
const banner = ref<{ ok: boolean; text: string } | null>(null)
const pageFilter = ref('')

const visiblePages = computed(() => {
  const q = pageFilter.value.trim().toLowerCase()
  if (!q) return pages.value
  return pages.value.filter((p) => {
    const hay = `${p.name} ${p.username} ${p.mappedSiteName}`.toLowerCase()
    return hay.includes(q)
  })
})

const statusLabel = computed(() => {
  if (integration.value.reconnectRequired) return 'Reconnect required'
  if (integration.value.connected) return 'Connected'
  return 'Not connected'
})

const statusPillClass = computed(() => {
  if (integration.value.reconnectRequired) return 'bg-amber-50 text-amber-800'
  if (integration.value.connected) return 'bg-emerald-50 text-emerald-800'
  return 'bg-surface-100 text-surface-600'
})

const pageCountLabel = computed(() => (pageCount.value == null ? '—' : String(pageCount.value)))

function metaBannerFromQuery(): { ok: boolean; text: string } | null {
  const q = String(route.query.meta || '')
  const map: Record<string, { ok: boolean; text: string }> = {
    connected: { ok: true, text: 'Meta connected. Map Facebook Pages to your sites below.' },
    denied: { ok: false, text: 'Meta authorization was cancelled.' },
    state_invalid: { ok: false, text: 'The Meta sign-in link was invalid. Try connecting again.' },
    state_expired: { ok: false, text: 'The Meta sign-in link expired. Try connecting again.' },
    missing_params: { ok: false, text: 'Meta did not return a complete authorization. Try again.' },
    config: { ok: false, text: 'Meta is not configured on the server.' },
    encrypt: { ok: false, text: 'Token encryption is not configured on the server.' },
    forbidden: { ok: false, text: 'Only the workspace owner can connect Meta.' },
    error: { ok: false, text: 'Meta connection failed. Try again.' },
  }
  return map[q] || null
}

async function loadStatus() {
  loading.value = true
  try {
    const res = await $fetch<{
      configured: boolean
      encryptionConfigured: boolean
      pageCount: number | null
      integration: IntegrationDto
    }>('/api/agency/integrations/meta/status', { headers: props.authHeaders() })
    configured.value = res.configured
    encryptionConfigured.value = res.encryptionConfigured
    pageCount.value = res.pageCount
    integration.value = res.integration
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    banner.value = { ok: false, text: err?.data?.message ?? err?.message ?? 'Failed to load Meta status.' }
  } finally {
    loading.value = false
  }
}

async function connectMeta() {
  connecting.value = true
  try {
    const res = await $fetch<{ url: string }>('/api/agency/integrations/meta/connect', {
      headers: props.authHeaders(),
      query: { returnPath: '/agency?tab=integrations' },
    })
    if (res.url) window.location.href = res.url
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    banner.value = { ok: false, text: err?.data?.message ?? err?.message ?? 'Could not start Meta connection.' }
    connecting.value = false
  }
}

async function disconnectMeta() {
  disconnecting.value = true
  try {
    await $fetch('/api/agency/integrations/meta/disconnect', { method: 'POST', headers: props.authHeaders() })
    confirmDisconnect.value = false
    pagesLoaded.value = false
    pages.value = []
    await loadStatus()
    banner.value = { ok: true, text: 'Meta disconnected.' }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    banner.value = { ok: false, text: err?.data?.message ?? err?.message ?? 'Disconnect failed.' }
  } finally {
    disconnecting.value = false
  }
}

async function loadPages() {
  loadingPages.value = true
  pageError.value = ''
  try {
    const res = await $fetch<{ pages: MetaPageRow[]; sites: Array<{ id: string; name: string; domain: string }> }>(
      '/api/agency/integrations/meta/pages',
      { headers: props.authHeaders() },
    )
    pages.value = res.pages
    sites.value = res.sites
    pagesLoaded.value = true
    pageCount.value = res.pages.length
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    pageError.value = err?.data?.message ?? err?.message ?? 'Could not load Facebook Pages.'
    pagesLoaded.value = true
  } finally {
    loadingPages.value = false
  }
}

async function mapPage(pageId: string) {
  const siteId = pendingSite[pageId]
  if (!siteId) return
  mappingId.value = pageId
  try {
    await $fetch('/api/agency/integrations/meta/pages/map', {
      method: 'POST',
      headers: props.authHeaders(),
      body: { pageId, siteId },
    })
    await loadPages()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    pageError.value = err?.data?.message ?? err?.message ?? 'Could not map this Page.'
  } finally {
    mappingId.value = ''
  }
}

async function unmapPage(connectionId: string) {
  if (!connectionId) return
  unmappingId.value = connectionId
  try {
    await $fetch(`/api/agency/integrations/meta/pages/${connectionId}`, {
      method: 'DELETE',
      headers: props.authHeaders(),
    })
    await loadPages()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    pageError.value = err?.data?.message ?? err?.message ?? 'Could not remove mapping.'
  } finally {
    unmappingId.value = ''
  }
}

onMounted(async () => {
  const q = String(route.query.meta || '')
  banner.value = metaBannerFromQuery()
  if (route.query.meta) {
    const next = { ...route.query }
    delete next.meta
    void router.replace({ query: next })
  }
  await loadStatus()
  if (integration.value.connected && q === 'connected') {
    await loadPages()
  }
})
</script>
