<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
    <div class="mb-6">
      <NuxtLink to="/crm/proposals" class="text-sm text-surface-500 hover:text-primary-600">← Proposals</NuxtLink>
      <h1 class="mt-2 text-2xl font-semibold text-surface-900">Proposal catalog</h1>
      <p class="mt-1 text-sm text-surface-500">
        Products come from your agency’s WooCommerce catalog site — never from a prospect site.
      </p>
    </div>

    <CrmSubNav />

    <div v-if="pending" class="py-12 text-center text-surface-500">Loading…</div>
    <div v-else class="space-y-6">
      <section class="rounded-xl border border-surface-200 bg-white p-5 space-y-4">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-surface-500">Catalog site</h2>
        <div>
          <label class="block text-sm font-medium text-surface-700">Selling agency store</label>
          <select v-model="catalogSiteId" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
            <option value="">— Select a site with WooCommerce —</option>
            <option v-for="s in siteOptions" :key="s.id" :value="s.id">
              {{ s.name }} ({{ s.domain || 'no domain' }}){{ s.woo_connected ? '' : ' — Woo not connected' }}
            </option>
          </select>
        </div>
        <p v-if="catalogSite && !catalogSite.woo_connected" class="text-sm text-amber-700">
          This site does not have WooCommerce API keys yet. Connect Woo on the site’s WooCommerce page, then sync.
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
            :disabled="saving"
            @click="saveSettings"
          >
            {{ saving ? 'Saving…' : 'Save catalog site' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50"
            :disabled="syncing || !catalogSiteId"
            @click="runSync"
          >
            {{ syncing ? 'Syncing…' : 'Sync products from Woo' }}
          </button>
        </div>
        <p v-if="message" class="text-sm text-emerald-700">{{ message }}</p>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <p v-if="lastSync" class="text-xs text-surface-500">{{ lastSync }}</p>
      </section>

      <section class="rounded-xl border border-surface-200 bg-white p-5 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-surface-500">Cached products</h2>
          <input
            v-model="search"
            type="search"
            placeholder="Search name or SKU"
            class="rounded-lg border border-surface-300 px-3 py-1.5 text-sm"
            @change="loadProducts"
          />
        </div>
        <div v-if="productsPending" class="py-8 text-center text-sm text-surface-500">Loading products…</div>
        <ul v-else-if="!products.length" class="py-8 text-center text-sm text-surface-500">
          No published products yet. Configure a catalog site and sync.
        </ul>
        <ul v-else class="divide-y divide-surface-100">
          <li v-for="p in products" :key="p.id" class="flex items-start gap-3 py-3">
            <img v-if="p.image_url" :src="p.image_url" alt="" class="h-12 w-12 rounded object-cover" />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-surface-900">{{ p.name }}</p>
              <p class="text-sm text-surface-500">
                {{ formatMoney(p.price, p.currency) }}
                <span v-if="p.sku"> · SKU {{ p.sku }}</span>
                · {{ p.status }}
              </p>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProposalProduct } from '~/types'

definePageMeta({ layout: 'default' })

const pending = ref(true)
const saving = ref(false)
const syncing = ref(false)
const productsPending = ref(false)
const error = ref('')
const message = ref('')
const lastSync = ref('')
const catalogSiteId = ref('')
const search = ref('')
const siteOptions = ref<
  Array<{ id: string; name: string; domain: string; woo_connected: boolean }>
>([])
const catalogSite = ref<{ id: string; name: string; domain: string; woo_connected: boolean } | null>(null)
const products = ref<ProposalProduct[]>([])

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
      catalog_site: { id: string; name: string; domain: string; woo_connected: boolean } | null
      site_options: Array<{ id: string; name: string; domain: string; woo_connected: boolean }>
    }>('/api/crm/proposal-settings', { headers: authHeaders() })
    catalogSiteId.value = data.settings.catalog_site_id || ''
    catalogSite.value = data.catalog_site
    siteOptions.value = data.site_options || []
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Failed to load settings'
  } finally {
    pending.value = false
  }
}

async function loadProducts() {
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

async function saveSettings() {
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    await $fetch('/api/crm/proposal-settings', {
      method: 'PATCH',
      headers: authHeaders(),
      body: { catalog_site_id: catalogSiteId.value || null },
    })
    message.value = 'Catalog site saved.'
    await loadSettings()
    await loadProducts()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Save failed'
  } finally {
    saving.value = false
  }
}

async function runSync() {
  syncing.value = true
  error.value = ''
  message.value = ''
  try {
    if (catalogSiteId.value) {
      await $fetch('/api/crm/proposal-settings', {
        method: 'PATCH',
        headers: authHeaders(),
        body: { catalog_site_id: catalogSiteId.value },
      })
    }
    const result = await $fetch<{
      fetched: number
      created: number
      updated: number
      archived: number
      synced_at: string
    }>('/api/crm/proposal-products/sync', {
      method: 'POST',
      headers: authHeaders(),
      body: { catalog_site_id: catalogSiteId.value || undefined },
    })
    message.value = `Synced ${result.fetched} products (${result.created} new, ${result.updated} updated, ${result.archived} archived).`
    lastSync.value = `Last sync ${new Date(result.synced_at).toLocaleString()}`
    await loadProducts()
    await loadSettings()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Sync failed'
  } finally {
    syncing.value = false
  }
}

onMounted(async () => {
  await loadSettings()
  await loadProducts()
})
</script>
