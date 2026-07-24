<template>
  <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-surface-900">{{ title }}</h2>
        <p class="mt-2 text-sm text-surface-500">
          Connect the agency site that sells your services. WooCommerce products from that store become the proposal catalog —
          never from a prospect site.
        </p>
      </div>
      <NuxtLink
        v-if="showCrmLink"
        to="/crm/proposals/settings"
        class="text-sm font-medium text-primary-600 hover:text-primary-700"
      >
        Full catalog →
      </NuxtLink>
    </div>

    <div v-if="pending" class="mt-6 py-8 text-center text-sm text-surface-500">Loading…</div>
    <div v-else class="mt-6 space-y-4">
      <div>
        <label class="block text-sm font-medium text-surface-700">Agency catalog site</label>
        <select v-model="catalogSiteId" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
          <option value="">— Select a site —</option>
          <option v-for="s in siteOptions" :key="s.id" :value="s.id">
            {{ s.name }}{{ s.domain ? ` (${s.domain})` : '' }}{{ s.woo_connected ? '' : ' — WooCommerce not connected' }}
          </option>
        </select>
      </div>

      <div
        v-if="selectedOption"
        class="rounded-lg border px-3 py-2 text-sm"
        :class="selectedOption.woo_connected ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'"
      >
        <template v-if="selectedOption.woo_connected">
          WooCommerce is connected on this site. Connecting will sync products into proposals.
        </template>
        <template v-else>
          WooCommerce API keys are not set on this site yet.
          <NuxtLink
            :to="`/sites/${selectedOption.id}/woocommerce`"
            class="font-medium underline hover:no-underline"
          >
            Connect WooCommerce
          </NuxtLink>
          first, then come back and connect the catalog.
        </template>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
          :disabled="connecting || !catalogSiteId"
          @click="connectCatalog"
        >
          {{ connecting ? connectingLabel : connectLabel }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
          :disabled="syncing || !savedCatalogSiteId || !savedWooConnected"
          @click="runSync"
        >
          {{ syncing ? 'Syncing…' : 'Sync products now' }}
        </button>
        <button
          v-if="savedCatalogSiteId"
          type="button"
          class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
          :disabled="connecting"
          @click="disconnectCatalog"
        >
          Disconnect
        </button>
      </div>

      <p v-if="message" class="text-sm text-emerald-700">{{ message }}</p>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="lastSync" class="text-xs text-surface-500">{{ lastSync }}</p>

      <div v-if="showProductPreview" class="border-t border-surface-100 pt-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-surface-500">
            Catalog products
            <span v-if="!productsPending" class="font-normal normal-case text-surface-400">({{ products.length }})</span>
          </h3>
          <input
            v-model="search"
            type="search"
            placeholder="Search name or SKU"
            class="rounded-lg border border-surface-300 px-3 py-1.5 text-sm"
            @change="loadProducts"
          />
        </div>
        <div v-if="productsPending" class="py-6 text-center text-sm text-surface-500">Loading products…</div>
        <ul v-else-if="!products.length" class="py-6 text-center text-sm text-surface-500">
          No published products yet. Connect a WooCommerce site and sync.
        </ul>
        <ul v-else class="divide-y divide-surface-100">
          <li v-for="p in products.slice(0, productLimit)" :key="p.id" class="flex items-start gap-3 py-3">
            <img v-if="p.image_url" :src="p.image_url" alt="" class="h-12 w-12 rounded object-cover" />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-surface-900">{{ p.name }}</p>
              <p class="text-sm text-surface-500">
                {{ formatMoney(p.price, p.currency) }}
                <span v-if="p.sku"> · SKU {{ p.sku }}</span>
              </p>
            </div>
          </li>
        </ul>
        <p v-if="products.length > productLimit" class="mt-2 text-xs text-surface-500">
          Showing {{ productLimit }} of {{ products.length }}.
          <NuxtLink to="/crm/proposals/settings" class="font-medium text-primary-600 hover:underline">View all</NuxtLink>
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ProposalProduct } from '~/types'

const props = withDefaults(
  defineProps<{
    title?: string
    showCrmLink?: boolean
    showProductPreview?: boolean
    productLimit?: number
  }>(),
  {
    title: 'Proposal catalog',
    showCrmLink: true,
    showProductPreview: true,
    productLimit: 8,
  },
)

const pending = ref(true)
const connecting = ref(false)
const syncing = ref(false)
const productsPending = ref(false)
const error = ref('')
const message = ref('')
const lastSync = ref('')
const catalogSiteId = ref('')
const savedCatalogSiteId = ref('')
const search = ref('')
const siteOptions = ref<Array<{ id: string; name: string; domain: string; woo_connected: boolean }>>([])
const products = ref<ProposalProduct[]>([])

const selectedOption = computed(() => siteOptions.value.find((s) => s.id === catalogSiteId.value) || null)
const savedWooConnected = computed(() => {
  const id = savedCatalogSiteId.value
  if (!id) return false
  return siteOptions.value.find((s) => s.id === id)?.woo_connected === true
})

const connectLabel = computed(() => {
  if (!selectedOption.value) return 'Connect site'
  if (!selectedOption.value.woo_connected) return 'Save catalog site'
  if (savedCatalogSiteId.value === catalogSiteId.value) return 'Reconnect & sync'
  return 'Connect site & sync products'
})

const connectingLabel = computed(() =>
  selectedOption.value?.woo_connected ? 'Connecting & syncing…' : 'Saving…',
)

function authHeaders(): Record<string, string> {
  const pb = usePocketbase()
  return pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}
}

function formatMoney(n: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(n)
  } catch {
    return String(n)
  }
}

async function loadSettings() {
  pending.value = true
  error.value = ''
  try {
    const data = await $fetch<{
      settings: { catalog_site_id: string | null }
      site_options: Array<{ id: string; name: string; domain: string; woo_connected: boolean }>
    }>('/api/crm/proposal-settings', { headers: authHeaders() })
    catalogSiteId.value = data.settings.catalog_site_id || ''
    savedCatalogSiteId.value = data.settings.catalog_site_id || ''
    siteOptions.value = data.site_options || []
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Failed to load catalog settings'
  } finally {
    pending.value = false
  }
}

async function loadProducts() {
  if (!props.showProductPreview) return
  productsPending.value = true
  try {
    const data = await $fetch<{ products: ProposalProduct[] }>('/api/crm/proposal-products', {
      headers: authHeaders(),
      query: { status: 'publish', search: search.value || undefined },
    })
    products.value = data.products || []
  } catch {
    products.value = []
  } finally {
    productsPending.value = false
  }
}

async function saveCatalogSite(siteId: string | null) {
  await $fetch('/api/crm/proposal-settings', {
    method: 'PATCH',
    headers: authHeaders(),
    body: { catalog_site_id: siteId },
  })
  savedCatalogSiteId.value = siteId || ''
}

async function syncProducts(siteId: string) {
  const result = await $fetch<{
    fetched: number
    created: number
    updated: number
    archived: number
    synced_at: string
  }>('/api/crm/proposal-products/sync', {
    method: 'POST',
    headers: authHeaders(),
    body: { catalog_site_id: siteId },
  })
  lastSync.value = `Last sync ${new Date(result.synced_at).toLocaleString()}`
  return result
}

async function connectCatalog() {
  if (!catalogSiteId.value) return
  connecting.value = true
  error.value = ''
  message.value = ''
  try {
    const site = selectedOption.value
    await saveCatalogSite(catalogSiteId.value)
    if (site?.woo_connected) {
      const result = await syncProducts(catalogSiteId.value)
      message.value = `Connected. Synced ${result.fetched} WooCommerce products into the proposal catalog (${result.created} new, ${result.updated} updated).`
    } else {
      message.value =
        'Catalog site saved. Connect WooCommerce on that site, then sync to pull products into proposals.'
    }
    await loadSettings()
    await loadProducts()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Could not connect catalog site'
  } finally {
    connecting.value = false
  }
}

async function runSync() {
  if (!savedCatalogSiteId.value) return
  syncing.value = true
  error.value = ''
  message.value = ''
  try {
    const result = await syncProducts(savedCatalogSiteId.value)
    message.value = `Synced ${result.fetched} products (${result.created} new, ${result.updated} updated, ${result.archived} archived).`
    await loadProducts()
    await loadSettings()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Sync failed'
  } finally {
    syncing.value = false
  }
}

async function disconnectCatalog() {
  connecting.value = true
  error.value = ''
  message.value = ''
  try {
    await saveCatalogSite(null)
    catalogSiteId.value = ''
    products.value = []
    lastSync.value = ''
    message.value = 'Catalog site disconnected. Proposals keep any items already added.'
    await loadSettings()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Could not disconnect'
  } finally {
    connecting.value = false
  }
}

onMounted(async () => {
  await loadSettings()
  await loadProducts()
})
</script>
