<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <NuxtLink to="/crm/proposals" class="text-sm text-surface-500 hover:text-primary-600">← Proposals</NuxtLink>
        <h1 class="mt-2 text-2xl font-semibold text-surface-900">{{ proposal?.title || 'Proposal' }}</h1>
        <p v-if="proposal" class="mt-1 text-sm text-surface-500">
          v{{ proposal.version }} ·
          <span class="capitalize">{{ proposal.status }}</span>
          <template v-if="proposal.expand?.client">
            ·
            <NuxtLink :to="`/crm/clients/${proposal.client}`" class="text-primary-600 hover:underline">
              {{ proposal.expand.client.name }}
            </NuxtLink>
          </template>
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-if="proposal?.status === 'draft'"
          type="button"
          class="rounded-lg border border-surface-300 px-3 py-2 text-sm font-medium hover:bg-surface-50"
          :disabled="saving || freezing"
          @click="saveMeta"
        >
          Save
        </button>
        <button
          v-if="proposal?.status === 'draft'"
          type="button"
          class="rounded-lg border border-surface-300 px-3 py-2 text-sm font-medium hover:bg-surface-50"
          :disabled="freezing"
          @click="freezeSnapshot"
        >
          {{ freezing ? 'Freezing…' : 'Freeze snapshot' }}
        </button>
        <button
          v-if="proposal && ['sent', 'viewed', 'declined'].includes(proposal.status)"
          type="button"
          class="rounded-lg border border-surface-300 px-3 py-2 text-sm font-medium hover:bg-surface-50"
          :disabled="freezing"
          @click="newVersion"
        >
          New version
        </button>
        <button
          type="button"
          class="rounded-lg border border-surface-300 px-3 py-2 text-sm font-medium hover:bg-surface-50"
          :disabled="pdfPending"
          @click="downloadPdf"
        >
          {{ pdfPending ? 'PDF…' : 'Download PDF' }}
        </button>
        <button
          v-if="proposal && ['draft', 'sent', 'viewed'].includes(proposal.status)"
          type="button"
          class="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-500"
          :disabled="sending"
          @click="sendProposal"
        >
          {{ proposal.status === 'draft' ? 'Send / get link' : 'Copy public link' }}
        </button>
      </div>
    </div>

    <div v-if="pending" class="py-12 text-center text-surface-500">Loading…</div>
    <div v-else-if="loadError" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ loadError }}</div>
    <template v-else-if="proposal">
      <div class="space-y-6">
        <section class="rounded-xl border border-surface-200 bg-white p-5 space-y-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-surface-500">Details</h2>
          <div>
            <label class="block text-sm font-medium text-surface-700">Title</label>
            <input
              v-model="form.title"
              type="text"
              class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
              :disabled="proposal.status !== 'draft'"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Intro</label>
            <textarea
              v-model="form.intro_html"
              rows="4"
              class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
              :disabled="proposal.status !== 'draft'"
              placeholder="Optional intro shown on the proposal"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Terms</label>
            <textarea
              v-model="form.terms_html"
              rows="3"
              class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
              :disabled="proposal.status !== 'draft'"
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-surface-700">Currency</label>
              <input
                v-model="form.currency"
                type="text"
                class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
                :disabled="proposal.status !== 'draft'"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Valid until</label>
              <input
                v-model="form.valid_until"
                type="date"
                class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
                :disabled="proposal.status !== 'draft'"
              />
            </div>
          </div>
          <p v-if="metaError" class="text-sm text-red-600">{{ metaError }}</p>
        </section>

        <section class="rounded-xl border border-surface-200 bg-white p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-surface-500">Line items</h2>
            <div v-if="proposal.status === 'draft'" class="flex flex-wrap gap-3">
              <button type="button" class="text-sm font-medium text-primary-600 hover:underline" @click="showCatalogPicker = true">
                Add from catalog
              </button>
              <button type="button" class="text-sm font-medium text-primary-600 hover:underline" @click="addItemRow">
                Add manual line
              </button>
            </div>
          </div>
          <div v-if="!itemRows.length" class="text-sm text-surface-500">
            No line items yet. Add from your Woo catalog or enter a manual line.
            <NuxtLink to="/crm/proposals/settings" class="text-primary-600 hover:underline">Catalog settings</NuxtLink>
          </div>
          <div v-for="(row, idx) in itemRows" :key="idx" class="grid gap-2 rounded-lg border border-surface-100 p-3 sm:grid-cols-12">
            <div class="sm:col-span-4">
              <input v-model="row.name" type="text" placeholder="Name" class="w-full rounded border border-surface-300 px-2 py-1.5 text-sm" :disabled="proposal.status !== 'draft'" />
              <p v-if="row.source === 'woo'" class="mt-0.5 text-[11px] text-surface-500">From catalog{{ row.sku ? ` · ${row.sku}` : '' }}</p>
            </div>
            <input v-model.number="row.qty" type="number" step="0.01" placeholder="Qty" class="sm:col-span-2 rounded border border-surface-300 px-2 py-1.5 text-sm" :disabled="proposal.status !== 'draft'" />
            <input v-model.number="row.unit_price" type="number" step="0.01" placeholder="Price" class="sm:col-span-2 rounded border border-surface-300 px-2 py-1.5 text-sm" :disabled="proposal.status !== 'draft'" />
            <select v-model="row.billing_interval" class="sm:col-span-3 rounded border border-surface-300 px-2 py-1.5 text-sm" :disabled="proposal.status !== 'draft'">
              <option value="one_time">One-time</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
              <option value="custom">Custom</option>
            </select>
            <button
              v-if="proposal.status === 'draft'"
              type="button"
              class="sm:col-span-1 text-sm text-red-600 hover:underline"
              @click="itemRows.splice(idx, 1)"
            >
              Remove
            </button>
            <textarea v-model="row.description" rows="2" placeholder="Description" class="sm:col-span-12 rounded border border-surface-300 px-2 py-1.5 text-sm" :disabled="proposal.status !== 'draft'" />
          </div>
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-surface-800">Total: {{ formatMoney(itemsTotal, form.currency) }}</p>
            <button
              v-if="proposal.status === 'draft'"
              type="button"
              class="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-500"
              :disabled="savingItems"
              @click="saveItems"
            >
              {{ savingItems ? 'Saving…' : 'Save items' }}
            </button>
          </div>
          <p v-if="itemsError" class="text-sm text-red-600">{{ itemsError }}</p>
        </section>

        <CrmModal v-model="showCatalogPicker" title="Add from Woo catalog">
          <div class="space-y-3">
            <input
              v-model="catalogSearch"
              type="search"
              placeholder="Search products"
              class="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
              @keydown.enter.prevent="loadCatalogProducts"
            />
            <div v-if="catalogPending" class="py-6 text-center text-sm text-surface-500">Loading…</div>
            <p v-else-if="catalogError" class="text-sm text-red-600">{{ catalogError }}</p>
            <ul v-else-if="!catalogProducts.length" class="py-6 text-center text-sm text-surface-500">
              No published products.
              <NuxtLink to="/crm/proposals/settings" class="text-primary-600 hover:underline" @click="showCatalogPicker = false">Sync catalog</NuxtLink>
            </ul>
            <ul v-else class="max-h-72 space-y-2 overflow-y-auto">
              <li
                v-for="p in catalogProducts"
                :key="p.id"
                class="flex items-center justify-between gap-3 rounded-lg border border-surface-100 px-3 py-2"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-surface-900">{{ p.name }}</p>
                  <p class="text-xs text-surface-500">{{ formatMoney(p.price, p.currency) }}<span v-if="p.sku"> · {{ p.sku }}</span></p>
                </div>
                <button type="button" class="shrink-0 text-sm font-medium text-primary-600 hover:underline" @click="addCatalogProduct(p)">
                  Add
                </button>
              </li>
            </ul>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50" @click="showCatalogPicker = false">
                Done
              </button>
              <button type="button" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500" @click="loadCatalogProducts">
                Refresh
              </button>
            </div>
          </template>
        </CrmModal>

        <section class="rounded-xl border border-surface-200 bg-white p-5 space-y-3">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-surface-500">Frozen snapshot</h2>
          <p v-if="!proposal.snapshot_json" class="text-sm text-surface-500">
            Not frozen yet. Click “Freeze snapshot” or send — Digital Snapshot notes (without internal notes) and any site audit data will be captured.
          </p>
          <template v-else>
            <p class="text-sm text-surface-600">
              Captured {{ formatDateTime(proposal.snapshot_json.captured_at) }}
              <span v-if="proposal.snapshot_json.website_url"> · {{ proposal.snapshot_json.website_url }}</span>
            </p>
            <ul class="list-inside list-disc text-sm text-surface-700">
              <li v-if="proposal.snapshot_json.intake?.homepage_notes">Homepage notes included</li>
              <li v-if="proposal.snapshot_json.intake?.local_visibility_notes">Local visibility notes included</li>
              <li v-if="proposal.snapshot_json.seo_basic">Site audit / SEO data included</li>
              <li v-if="proposal.branding_json">Agency branding frozen</li>
            </ul>
          </template>
        </section>

        <section class="rounded-xl border border-surface-200 bg-white p-5 space-y-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-surface-500">On acceptance</h2>
          <p class="text-sm text-surface-500">When the prospect (or you) accepts, run these CRM updates.</p>
          <div class="grid gap-2 sm:grid-cols-2">
            <label v-for="opt in acceptanceOptionFields" :key="opt.key" class="flex items-start gap-2 text-sm text-surface-800">
              <input
                v-model="acceptanceOptions[opt.key]"
                type="checkbox"
                class="mt-0.5"
                :disabled="proposal.status !== 'draft' && proposal.status !== 'sent' && proposal.status !== 'viewed'"
              />
              <span>{{ opt.label }}</span>
            </label>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-if="['draft', 'sent', 'viewed'].includes(proposal.status)"
              type="button"
              class="rounded-lg border border-surface-300 px-3 py-2 text-sm font-medium hover:bg-surface-50"
              :disabled="savingOptions"
              @click="saveAcceptanceOptions"
            >
              {{ savingOptions ? 'Saving…' : 'Save options' }}
            </button>
            <button
              v-if="['draft', 'sent', 'viewed'].includes(proposal.status)"
              type="button"
              class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              :disabled="accepting"
              @click="agencyAccept"
            >
              {{ accepting ? 'Accepting…' : 'Mark accepted' }}
            </button>
            <button
              v-if="['draft', 'sent', 'viewed'].includes(proposal.status)"
              type="button"
              class="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              :disabled="declining"
              @click="agencyDecline"
            >
              {{ declining ? '…' : 'Mark declined' }}
            </button>
            <NuxtLink
              v-if="proposal.status === 'accepted' && proposal.expand?.client"
              :to="`/crm/onboarding`"
              class="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
            >
              Open onboarding
            </NuxtLink>
          </div>
          <p v-if="acceptMessage" class="text-sm text-emerald-700">{{ acceptMessage }}</p>
          <p v-if="acceptError" class="text-sm text-red-600">{{ acceptError }}</p>
        </section>

        <section v-if="publicUrl" class="rounded-xl border border-surface-200 bg-surface-50 p-5 space-y-2">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-surface-500">Public link</h2>
          <a :href="publicUrl" target="_blank" rel="noopener" class="break-all text-sm text-primary-600 hover:underline">{{ publicUrl }}</a>
          <p class="text-xs text-surface-500">Share this link with the prospect. Token is also stored on the proposal.</p>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Proposal, ProposalAcceptanceOptions, ProposalItem, ProposalProduct } from '~/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id || ''))

const proposal = ref<Proposal | null>(null)
const pending = ref(true)
const loadError = ref('')
const saving = ref(false)
const savingItems = ref(false)
const sending = ref(false)
const freezing = ref(false)
const pdfPending = ref(false)
const metaError = ref('')
const itemsError = ref('')
const publicUrl = ref('')
const showCatalogPicker = ref(false)
const catalogSearch = ref('')
const catalogPending = ref(false)
const catalogError = ref('')
const catalogProducts = ref<ProposalProduct[]>([])
const savingOptions = ref(false)
const accepting = ref(false)
const declining = ref(false)
const acceptMessage = ref('')
const acceptError = ref('')

const acceptanceOptionFields = [
  { key: 'mark_deal_won' as const, label: 'Mark linked deal as won' },
  { key: 'set_pipeline_stage_won' as const, label: 'Set pipeline stage to Won' },
  { key: 'convert_lead_to_client' as const, label: 'Convert lead → client' },
  { key: 'promote_site_to_active' as const, label: 'Promote prospect site to active' },
  { key: 'create_onboarding_tasks' as const, label: 'Create onboarding tasks' },
  { key: 'log_activity' as const, label: 'Log timeline activity' },
]

const acceptanceOptions = reactive<Required<ProposalAcceptanceOptions>>({
  mark_deal_won: true,
  convert_lead_to_client: true,
  promote_site_to_active: true,
  create_onboarding_tasks: true,
  log_activity: true,
  set_pipeline_stage_won: true,
})

const form = reactive({
  title: '',
  intro_html: '',
  terms_html: '',
  currency: 'USD',
  valid_until: '',
})

type ItemRow = {
  name: string
  description: string
  qty: number
  unit_price: number
  billing_interval: 'one_time' | 'month' | 'year' | 'custom'
  source: 'manual' | 'woo' | 'package'
  product?: string | null
  external_product_id?: string | null
  sku?: string | null
}

const itemRows = ref<ItemRow[]>([])

const itemsTotal = computed(() =>
  itemRows.value.reduce((s, r) => s + Number(r.qty || 0) * Number(r.unit_price || 0), 0),
)

function authHeaders(): Record<string, string> {
  const pb = usePocketbase()
  return pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}
}

function formatMoney(n: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n)
  } catch {
    return String(n)
  }
}

function formatDateTime(iso?: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function toDateInput(v?: string | null) {
  if (!v) return ''
  return v.slice(0, 10)
}

function appOrigin() {
  if (import.meta.client) return window.location.origin
  return ''
}

function hydrate(p: Proposal, items: ProposalItem[]) {
  proposal.value = p
  form.title = p.title || ''
  form.intro_html = p.intro_html || ''
  form.terms_html = p.terms_html || ''
  form.currency = p.currency || 'USD'
  form.valid_until = toDateInput(p.valid_until)
  itemRows.value = items.map((it) => ({
    name: it.name,
    description: it.description || '',
    qty: Number(it.qty) || 0,
    unit_price: Number(it.unit_price) || 0,
    billing_interval: (it.billing_interval as ItemRow['billing_interval']) || 'one_time',
    source: (it.source as ItemRow['source']) || 'manual',
    product: it.product || null,
    external_product_id: it.external_product_id || null,
    sku: it.sku || null,
  }))
  if (p.public_token) {
    publicUrl.value = `${appOrigin()}/p/${p.public_token}`
  }
  const opts = p.acceptance_options_json || {}
  acceptanceOptions.mark_deal_won = opts.mark_deal_won !== false
  acceptanceOptions.convert_lead_to_client = opts.convert_lead_to_client !== false
  acceptanceOptions.promote_site_to_active = opts.promote_site_to_active !== false
  acceptanceOptions.create_onboarding_tasks = opts.create_onboarding_tasks !== false
  acceptanceOptions.log_activity = opts.log_activity !== false
  acceptanceOptions.set_pipeline_stage_won = opts.set_pipeline_stage_won !== false
  acceptMessage.value = ''
  acceptError.value = ''
}

async function load() {
  if (!id.value) return
  pending.value = true
  loadError.value = ''
  try {
    const data = await $fetch<{ proposal: Proposal; items: ProposalItem[] }>(`/api/crm/proposals/${id.value}`, {
      headers: authHeaders(),
    })
    hydrate(data.proposal, data.items || [])
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    loadError.value = err?.data?.message ?? err?.message ?? 'Failed to load proposal'
    proposal.value = null
  } finally {
    pending.value = false
  }
}

function addItemRow() {
  itemRows.value.push({
    name: '',
    description: '',
    qty: 1,
    unit_price: 0,
    billing_interval: 'one_time',
    source: 'manual',
    product: null,
    external_product_id: null,
    sku: null,
  })
}

async function loadCatalogProducts() {
  catalogPending.value = true
  catalogError.value = ''
  try {
    const data = await $fetch<{ products: ProposalProduct[] }>('/api/crm/proposal-products', {
      headers: authHeaders(),
      query: { status: 'publish', search: catalogSearch.value || undefined },
    })
    catalogProducts.value = data.products || []
    if (!catalogProducts.value.length && !catalogSearch.value) {
      catalogError.value = 'No published catalog products. Sync from Catalog settings first.'
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    catalogError.value = err?.data?.message ?? err?.message ?? 'Failed to load catalog'
    catalogProducts.value = []
  } finally {
    catalogPending.value = false
  }
}

function addCatalogProduct(p: ProposalProduct) {
  itemRows.value.push({
    name: p.name,
    description: p.description || '',
    qty: 1,
    unit_price: Number(p.price) || 0,
    billing_interval: 'one_time',
    source: 'woo',
    product: p.id,
    external_product_id: p.external_id,
    sku: p.sku || null,
  })
}

watch(showCatalogPicker, (open) => {
  if (open) void loadCatalogProducts()
})

async function saveMeta() {
  if (!proposal.value || proposal.value.status !== 'draft') return
  saving.value = true
  metaError.value = ''
  try {
    const data = await $fetch<{ proposal: Proposal }>(`/api/crm/proposals/${id.value}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: {
        title: form.title,
        intro_html: form.intro_html || null,
        terms_html: form.terms_html || null,
        currency: form.currency,
        valid_until: form.valid_until || null,
      },
    })
    proposal.value = { ...proposal.value, ...data.proposal }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    metaError.value = err?.data?.message ?? err?.message ?? 'Save failed'
  } finally {
    saving.value = false
  }
}

async function saveItems() {
  if (!proposal.value || proposal.value.status !== 'draft') return
  savingItems.value = true
  itemsError.value = ''
  try {
    const data = await $fetch<{ proposal: Proposal; items: ProposalItem[] }>(`/api/crm/proposals/${id.value}/items`, {
      method: 'POST',
      headers: authHeaders(),
      body: {
        items: itemRows.value
          .filter((r) => r.name.trim())
          .map((r) => ({
            source: r.source || 'manual',
            product: r.product || null,
            external_product_id: r.external_product_id || null,
            sku: r.sku || null,
            name: r.name.trim(),
            description: r.description || null,
            qty: Number(r.qty) || 0,
            unit_price: Number(r.unit_price) || 0,
            billing_interval: r.billing_interval,
          })),
      },
    })
    hydrate(data.proposal, data.items || [])
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    itemsError.value = err?.data?.message ?? err?.message ?? 'Failed to save items'
  } finally {
    savingItems.value = false
  }
}

async function freezeSnapshot() {
  freezing.value = true
  metaError.value = ''
  try {
    const data = await $fetch<{ proposal: Proposal; items: ProposalItem[] }>(
      `/api/crm/proposals/${id.value}/generate-version`,
      { method: 'POST', headers: authHeaders(), body: { mode: 'freeze' } },
    )
    hydrate(data.proposal, data.items || [])
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    metaError.value = err?.data?.message ?? err?.message ?? 'Freeze failed'
  } finally {
    freezing.value = false
  }
}

async function newVersion() {
  freezing.value = true
  metaError.value = ''
  try {
    const data = await $fetch<{ proposal: Proposal; items: ProposalItem[]; created_new?: boolean }>(
      `/api/crm/proposals/${id.value}/generate-version`,
      { method: 'POST', headers: authHeaders(), body: { mode: 'new_version' } },
    )
    if (data.created_new && data.proposal?.id) {
      await router.push(`/crm/proposals/${data.proposal.id}`)
      return
    }
    hydrate(data.proposal, data.items || [])
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    metaError.value = err?.data?.message ?? err?.message ?? 'Could not create version'
  } finally {
    freezing.value = false
  }
}

async function sendProposal() {
  if (!proposal.value) return
  sending.value = true
  metaError.value = ''
  try {
    const data = await $fetch<{ proposal: Proposal; public_token: string; public_url: string }>(
      `/api/crm/proposals/${id.value}/send`,
      { method: 'POST', headers: authHeaders() },
    )
    proposal.value = { ...proposal.value, ...data.proposal, public_token: data.public_token }
    publicUrl.value = data.public_url || `${appOrigin()}/p/${data.public_token}`
    if (import.meta.client && publicUrl.value) {
      try {
        await navigator.clipboard.writeText(publicUrl.value)
      } catch {
        //
      }
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    metaError.value = err?.data?.message ?? err?.message ?? 'Send failed'
  } finally {
    sending.value = false
  }
}

async function downloadPdf() {
  pdfPending.value = true
  metaError.value = ''
  try {
    const blob = await $fetch<Blob>(`/api/crm/proposals/${id.value}/pdf`, {
      method: 'POST',
      headers: authHeaders(),
      responseType: 'blob',
    })
    if (import.meta.client) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(proposal.value?.title || 'proposal').replace(/\s+/g, '-').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    metaError.value = err?.data?.message ?? err?.message ?? 'PDF failed'
  } finally {
    pdfPending.value = false
  }
}

async function saveAcceptanceOptions() {
  if (!proposal.value) return
  savingOptions.value = true
  acceptError.value = ''
  acceptMessage.value = ''
  try {
    const data = await $fetch<{ proposal: Proposal }>(`/api/crm/proposals/${id.value}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: {
        acceptance_options_json: { ...acceptanceOptions },
      },
    })
    proposal.value = { ...proposal.value, ...data.proposal }
    acceptMessage.value = 'Acceptance options saved.'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    // Draft-only patch may block sent proposals — allow via dedicated path by temporarily noting
    acceptError.value = err?.data?.message ?? err?.message ?? 'Could not save options'
    // If not draft, still try accept with options override
    if (proposal.value.status !== 'draft') {
      acceptError.value =
        'Options on sent proposals apply at accept time. Click Mark accepted to run with the checkboxes above.'
    }
  } finally {
    savingOptions.value = false
  }
}

async function agencyAccept() {
  if (!proposal.value) return
  if (!window.confirm('Accept this proposal and run the selected CRM updates?')) return
  accepting.value = true
  acceptError.value = ''
  acceptMessage.value = ''
  try {
    // Persist options on draft first when possible
    if (proposal.value.status === 'draft') {
      await $fetch(`/api/crm/proposals/${id.value}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: { acceptance_options_json: { ...acceptanceOptions } },
      }).catch(() => null)
    }
    const data = await $fetch<{
      already: boolean
      effects: Record<string, unknown>
      proposal: Proposal
      items: ProposalItem[]
    }>(`/api/crm/proposals/${id.value}/accept`, {
      method: 'POST',
      headers: authHeaders(),
      body: {
        name: 'Agency (on behalf of client)',
        options: { ...acceptanceOptions },
        skip_expiry_check: true,
      },
    })
    hydrate(data.proposal, data.items || [])
    const bits: string[] = []
    const fx = data.effects || {}
    if (fx.mark_deal_won === true) bits.push('deal won')
    if (fx.convert_lead_to_client === true) bits.push('converted to client')
    if (fx.promote_site_to_active === true) bits.push('site promoted')
    if (typeof fx.create_onboarding_tasks === 'number') bits.push(`${fx.create_onboarding_tasks} tasks`)
    const errs = Array.isArray(fx.errors) ? (fx.errors as string[]) : []
    acceptMessage.value = data.already
      ? 'Already accepted.'
      : `Accepted.${bits.length ? ` ${bits.join(', ')}.` : ''}${errs.length ? ` Warnings: ${errs.join('; ')}` : ''}`
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    acceptError.value = err?.data?.message ?? err?.message ?? 'Accept failed'
  } finally {
    accepting.value = false
  }
}

async function agencyDecline() {
  if (!proposal.value) return
  if (!window.confirm('Mark this proposal declined?')) return
  declining.value = true
  acceptError.value = ''
  try {
    const data = await $fetch<{ proposal: Proposal; items: ProposalItem[] }>(
      `/api/crm/proposals/${id.value}/decline`,
      { method: 'POST', headers: authHeaders(), body: {} },
    )
    hydrate(data.proposal, data.items || [])
    acceptMessage.value = 'Marked declined.'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    acceptError.value = err?.data?.message ?? err?.message ?? 'Decline failed'
  } finally {
    declining.value = false
  }
}

onMounted(load)
watch(id, load)
</script>
