<template>
  <div class="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6 sm:py-8">
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
          class="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          :disabled="deleting"
          @click="deleteProposal"
        >
          {{ deleting ? 'Deleting…' : 'Delete' }}
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
        <section
          v-if="proposal.status === 'draft'"
          class="rounded-xl border border-primary-100 bg-gradient-to-b from-primary-50/80 to-white p-5 space-y-4"
        >
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wide text-primary-800">Generate proposal</h2>
            <p class="mt-1 text-sm text-surface-600">
              One consistent branded deck for every client — cover, opportunity, 90-day plan, investment. Your
              <NuxtLink to="/agency" class="text-primary-600 hover:underline">Agency logo and colors</NuxtLink>
              appear automatically on the link and PDF. Pick the service type, add notes (price, scope, client context), then generate.
            </p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-surface-700">What are you proposing?</label>
              <select
                v-model="engagementType"
                class="mt-1 w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm"
              >
                <option value="monthly_marketing">Monthly digital marketing package (SEO, ads, reporting)</option>
                <option value="website_project">Website or one-time build project</option>
                <option value="website_plus_retainer">Website build + ongoing monthly marketing</option>
                <option value="add_on">Add-on or standalone service</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-surface-700">Notes for Claude (optional)</label>
              <textarea
                v-model="assistNotes"
                rows="2"
                class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
                placeholder="e.g. $5,000 attorney website at danhigsonattorney.com — 8 pages, no ecommerce"
              />
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-60"
              :disabled="assistPending"
              @click="runProposalAssist"
            >
              {{ assistPending ? 'Generating…' : presentationDeck ? 'Regenerate proposal' : 'Generate proposal' }}
            </button>
            <a
              v-if="publicUrl"
              :href="publicUrl"
              target="_blank"
              rel="noopener"
              class="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm font-medium text-surface-800 hover:bg-surface-50"
            >
              Preview link
            </a>
          </div>
          <p v-if="assistError" class="text-sm text-red-600">{{ assistError }}</p>
          <p v-if="assistMessage" class="text-sm text-emerald-700">{{ assistMessage }}</p>
        </section>

        <section v-if="presentationDeck" class="rounded-xl border border-surface-200 bg-slate-100 p-4 sm:p-6">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-surface-600">Preview — same layout every time</h2>
            <p v-if="itemRows.length" class="text-sm font-medium text-surface-800">Total {{ formatMoney(itemsTotal, form.currency) }}</p>
          </div>
          <div class="mx-auto overflow-hidden rounded-lg border border-surface-200 bg-white shadow-sm">
            <ProposalBrandedDeck
              :deck="presentationDeck"
              :client-name="clientDisplayName"
              :client-location="clientLocation"
              :currency="form.currency"
              :logo-url="previewBranding.logo_url"
              :colors="previewBranding.colors"
            />
          </div>
          <p v-if="itemsError" class="mt-2 text-sm text-red-600">{{ itemsError }}</p>
        </section>
        <p v-else-if="proposal.status === 'draft'" class="rounded-lg border border-dashed border-surface-300 px-4 py-8 text-center text-sm text-surface-500">
          Choose a service type, add notes, and click <span class="font-medium text-surface-700">Generate proposal</span>.
        </p>

        <section class="rounded-xl border border-surface-200 bg-white p-5 space-y-3">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-surface-500">Finalize &amp; send</h2>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-surface-700">Proposal title</label>
              <input
                v-model="form.title"
                type="text"
                class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
                :disabled="proposal.status !== 'draft'"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Currency</label>
              <input v-model="form.currency" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" :disabled="proposal.status !== 'draft'" />
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700">Valid until</label>
              <input v-model="form.valid_until" type="date" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" :disabled="proposal.status !== 'draft'" />
            </div>
          </div>
          <p v-if="metaError" class="text-sm text-red-600">{{ metaError }}</p>
        </section>

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
import { normalizeProposalDeck, type ProposalDeckPresentation } from '~/lib/proposalDeck'
import type { Proposal, ProposalAcceptanceOptions, ProposalItem, ProposalServicePackage } from '~/types'

type ProposalEngagementType = 'monthly_marketing' | 'website_project' | 'website_plus_retainer' | 'add_on'

type AssistLineItem = {
  sku?: string | null
  name: string
  description: string
  unit_price: number
  billing_interval: 'one_time' | 'month' | 'year' | 'custom'
}

type AssistSuggestion = {
  title: string
  intro_html: string
  terms_html: string
  line_items: AssistLineItem[]
  recommended_package_skus: string[]
  rationale: string
  deck?: Record<string, unknown> | null
}

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
const deleting = ref(false)
const pdfPending = ref(false)
const metaError = ref('')
const itemsError = ref('')
const publicUrl = ref('')
const servicePackages = ref<ProposalServicePackage[]>([])
const engagementType = ref<ProposalEngagementType>('monthly_marketing')
const assistNotes = ref('')
const assistPending = ref(false)
const assistError = ref('')
const assistMessage = ref('')
const presentationDeck = ref<ProposalDeckPresentation | null>(null)
const previewBranding = ref<{
  logo_url?: string | null
  colors?: { primary?: string; accent?: string; text?: string; surface?: string }
}>({})

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
  metadata_json?: Record<string, unknown> | null
}

const itemRows = ref<ItemRow[]>([])

const itemsTotal = computed(() =>
  itemRows.value.reduce((s, r) => s + Number(r.unit_price || 0), 0),
)

const clientDisplayName = computed(
  () => proposal.value?.expand?.client?.company || proposal.value?.expand?.client?.name || '',
)
const clientLocation = computed(() => {
  const c = proposal.value?.expand?.client
  if (!c) return ''
  return [c.mailing_city, c.mailing_state].filter(Boolean).join(', ')
})

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

function billingLabel(interval: string) {
  if (interval === 'month') return 'Monthly'
  if (interval === 'year') return 'Yearly'
  if (interval === 'custom') return 'Custom billing'
  return 'One-time'
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
  itemRows.value = items.map((it) => {
    const meta = { ...(it.metadata_json || {}) } as Record<string, unknown>
    if (it.source === 'package' && meta.catalog_default_unit_price == null) {
      meta.catalog_default_unit_price = Number(it.unit_price) || 0
    }
    return {
      name: it.name,
      description: it.description || '',
      qty: Number(it.qty) || 0,
      unit_price: Number(it.unit_price) || 0,
      billing_interval: (it.billing_interval as ItemRow['billing_interval']) || 'one_time',
      source: (it.source as ItemRow['source']) || 'manual',
      product: it.product || null,
      external_product_id: it.external_product_id || null,
      sku: it.sku || null,
      metadata_json: meta,
    }
  })
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
  presentationDeck.value = normalizeProposalDeck((p as { presentation_json?: unknown }).presentation_json)
  const b = p.branding_json as { logo_url?: string; colors?: Record<string, string> } | null | undefined
  if (b?.logo_url || b?.colors) {
    previewBranding.value = { logo_url: b.logo_url, colors: b.colors as typeof previewBranding.value.colors }
  }
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

async function loadServicePackages() {
  try {
    const data = await $fetch<{ packages: ProposalServicePackage[] }>('/api/crm/service-packages', {
      headers: authHeaders(),
      query: { active: '1' },
    })
    servicePackages.value = data.packages || []
  } catch {
    servicePackages.value = []
  }
}

async function loadPreviewBranding() {
  try {
    const [branding, logo] = await Promise.all([
      $fetch<{ branding?: { primary?: string; accent?: string; text?: string; surface?: string; name?: string } }>(
        '/api/agency/branding',
        { headers: authHeaders() },
      ),
      $fetch<{ url?: string | null }>('/api/agency/logo', { headers: authHeaders() }).catch(() => ({ url: null })),
    ])
    const b = branding.branding || {}
    previewBranding.value = {
      logo_url: logo.url || null,
      colors: {
        primary: b.primary,
        accent: b.accent,
        text: b.text,
        surface: b.surface,
      },
    }
  } catch {
    /* optional */
  }
}

async function runProposalAssist() {
  if (!proposal.value || proposal.value.status !== 'draft') return
  assistPending.value = true
  assistError.value = ''
  assistMessage.value = ''
  try {
    if (!servicePackages.value.length) await loadServicePackages()
    if (!previewBranding.value.logo_url) await loadPreviewBranding()
    const data = await $fetch<{ suggestion: AssistSuggestion }>(`/api/crm/proposals/${id.value}/assist`, {
      method: 'POST',
      headers: authHeaders(),
      body: {
        engagement_type: engagementType.value,
        notes: assistNotes.value.trim() || undefined,
      },
    })
    await applyAssistSuggestion(data.suggestion)
    assistMessage.value = 'Proposal ready — preview below, then send or download PDF.'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    assistError.value = err?.data?.message ?? err?.message ?? 'Claude assist failed'
  } finally {
    assistPending.value = false
  }
}

function itemRowFromAssistLine(line: AssistLineItem, bySku: Map<string, ProposalServicePackage>): ItemRow {
  const pkg = line.sku ? bySku.get(line.sku) : undefined
  const catalogDefault = pkg ? Number(pkg.default_unit_price) || 0 : null
  const billing = (line.billing_interval ||
    (pkg?.billing_interval as ItemRow['billing_interval']) ||
    'one_time') as ItemRow['billing_interval']
  return {
    name: line.name,
    description: line.description || pkg?.description_html || '',
    qty: 1,
    unit_price: Number(line.unit_price) || 0,
    billing_interval: billing,
    source: line.sku && pkg ? 'package' : 'manual',
    product: null,
    external_product_id: null,
    sku: line.sku && pkg ? line.sku : null,
    metadata_json:
      line.sku && pkg
        ? {
            service_package_id: pkg.id,
            package_sku: pkg.sku,
            catalog_default_unit_price: catalogDefault,
            claude_drafted: true,
          }
        : { claude_drafted: true },
  }
}

async function applyAssistSuggestion(s: AssistSuggestion) {
  if (!s) return
  if (s.title) form.title = s.title
  if (s.intro_html) form.intro_html = s.intro_html
  if (s.terms_html) form.terms_html = s.terms_html
  const bySku = new Map(servicePackages.value.map((p) => [p.sku, p]))
  let lines = s.line_items || []
  if (!lines.length && s.recommended_package_skus?.length) {
    lines = s.recommended_package_skus
      .map((sku) => {
        const pkg = bySku.get(sku)
        if (!pkg) return null
        return {
          sku,
          name: pkg.name,
          description: pkg.description_html || '',
          unit_price: Number(pkg.default_unit_price) || 0,
          billing_interval: (pkg.billing_interval || 'one_time') as AssistLineItem['billing_interval'],
        }
      })
      .filter((x): x is AssistLineItem => x != null)
  }
  itemRows.value = lines.map((line) => itemRowFromAssistLine(line, bySku))
  if (s.deck) {
    presentationDeck.value = normalizeProposalDeck(s.deck) || null
  }
  await saveMeta()
  if (s.deck) await savePresentation(s.deck)
  if (itemRows.value.length) await saveItems()
}

async function savePresentation(deck: Record<string, unknown>) {
  if (!proposal.value || proposal.value.status !== 'draft') return
  try {
    await $fetch(`/api/crm/proposals/${id.value}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: { presentation_json: deck },
    })
  } catch {
    /* presentation_json field may be missing until proposal collections migrate on VPS */
  }
}

async function deleteProposal() {
  if (!proposal.value || proposal.value.status !== 'draft') return
  if (!import.meta.client) return
  if (!window.confirm('Delete this draft proposal? This cannot be undone.')) return
  deleting.value = true
  loadError.value = ''
  try {
    await $fetch(`/api/crm/proposals/${id.value}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    await router.push('/crm/proposals')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    loadError.value = err?.data?.message ?? err?.message ?? 'Failed to delete proposal'
  } finally {
    deleting.value = false
  }
}

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
          .map((r) => {
            const rawSource = r.source || 'manual'
            const source = rawSource === 'woo' ? 'manual' : rawSource
            const meta = r.metadata_json ? { ...r.metadata_json } : null
            if (source === 'package' && meta) {
              meta.description_customized = true
            }
            return {
              source,
              product: null,
              external_product_id: null,
              sku: source === 'package' ? r.sku || null : null,
              name: r.name.trim(),
              description: r.description || null,
              qty: 1,
              unit_price: Number(r.unit_price) || 0,
              billing_interval: r.billing_interval,
              metadata_json: Object.keys(meta).length ? meta : null,
            }
          }),
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

onMounted(() => {
  void load()
  void loadPreviewBranding()
})
watch(id, load)
</script>
