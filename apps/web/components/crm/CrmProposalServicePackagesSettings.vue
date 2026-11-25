<template>
  <section class="space-y-6">
    <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-surface-900">{{ title }}</h2>
          <p class="mt-2 text-sm text-surface-500">
            Service packages are your proposal catalog—stable scope copy with default prices. No WooCommerce required.
            Prices are easy to change per proposal; descriptions stay tied to the package until you override on a line.
          </p>
        </div>
        <div v-if="compact" class="flex gap-2">
          <NuxtLink to="/crm/proposals/settings" class="text-sm font-medium text-primary-600 hover:underline">
            Manage packages →
          </NuxtLink>
        </div>
      </div>

      <div v-if="!compact" class="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
          :disabled="seeding"
          @click="runSeedVma"
        >
          {{ seeding ? 'Importing…' : 'Load VMA default packages' }}
        </button>
        <span v-if="packageCount !== null" class="self-center text-sm text-surface-500">{{ packageCount }} packages</span>
      </div>
      <p v-if="compact && packageCount !== null" class="mt-3 text-sm text-surface-600">
        {{ packageCount }} service package{{ packageCount === 1 ? '' : 's' }} configured.
      </p>
      <p v-if="seedMessage" class="mt-2 text-sm text-emerald-700">{{ seedMessage }}</p>
      <p v-if="loadError" class="mt-2 text-sm text-red-600">{{ loadError }}</p>
    </section>

    <section v-if="!compact" class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm space-y-4">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-surface-500">Default proposal template</h3>
      <p class="text-sm text-surface-500">Applied when you create a new proposal (intro, terms, currency).</p>
      <div>
        <label class="block text-sm font-medium text-surface-700">Intro</label>
        <textarea v-model="template.intro_html" rows="4" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-sm font-medium text-surface-700">Terms</label>
        <textarea v-model="template.terms_html" rows="4" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
      </div>
      <div class="max-w-xs">
        <label class="block text-sm font-medium text-surface-700">Currency</label>
        <input v-model="template.currency" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
      </div>
      <button
        type="button"
        class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50 disabled:opacity-50"
        :disabled="savingTemplate"
        @click="saveTemplate"
      >
        {{ savingTemplate ? 'Saving…' : 'Save template' }}
      </button>
      <p v-if="templateMessage" class="text-sm text-emerald-700">{{ templateMessage }}</p>
      <p v-if="templateError" class="text-sm text-red-600">{{ templateError }}</p>
    </section>

    <section v-if="!compact" class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-surface-500">Packages</h3>
        <button type="button" class="text-sm font-medium text-primary-600 hover:underline" @click="showAdd = !showAdd">
          {{ showAdd ? 'Close' : 'Add package' }}
        </button>
      </div>

      <form v-if="showAdd" class="mb-6 space-y-3 rounded-lg border border-dashed border-surface-300 p-4" @submit.prevent="createPackage">
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="block text-xs font-medium text-surface-600">SKU</label>
            <input v-model="newForm.sku" required type="text" class="mt-1 w-full rounded border border-surface-300 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-surface-600">Name</label>
            <input v-model="newForm.name" required type="text" class="mt-1 w-full rounded border border-surface-300 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-surface-600">Default price</label>
            <input v-model.number="newForm.default_unit_price" required type="number" step="0.01" class="mt-1 w-full rounded border border-surface-300 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-surface-600">Billing</label>
            <select v-model="newForm.billing_interval" class="mt-1 w-full rounded border border-surface-300 px-2 py-1.5 text-sm">
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
              <option value="one_time">One-time</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-surface-600">Description (scope copy)</label>
          <textarea v-model="newForm.description_html" rows="5" class="mt-1 w-full rounded border border-surface-300 px-2 py-1.5 text-sm" />
        </div>
        <button type="submit" class="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-500" :disabled="creating">
          {{ creating ? 'Adding…' : 'Add package' }}
        </button>
        <p v-if="createError" class="text-sm text-red-600">{{ createError }}</p>
      </form>

      <div v-if="pending" class="py-8 text-center text-sm text-surface-500">Loading packages…</div>
      <p v-else-if="!packages.length" class="py-8 text-center text-sm text-surface-500">
        No packages yet. Click “Load VMA default packages” or add your own.
      </p>
      <ul v-else class="divide-y divide-surface-100">
        <li v-for="pkg in packages" :key="pkg.id" class="py-4">
          <div v-if="editingId !== pkg.id">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p class="font-medium text-surface-900">{{ pkg.name }}</p>
                <p class="text-sm text-surface-500">
                  {{ pkg.sku }} · {{ formatMoney(pkg.default_unit_price) }} · {{ pkg.billing_interval }}
                  <span v-if="!pkg.active" class="text-amber-600"> · inactive</span>
                </p>
              </div>
              <div class="flex gap-2">
                <button type="button" class="text-sm text-primary-600 hover:underline" @click="startEdit(pkg)">Edit</button>
                <button type="button" class="text-sm text-red-600 hover:underline" @click="removePackage(pkg.id)">Remove</button>
              </div>
            </div>
            <pre class="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded bg-surface-50 p-2 text-xs text-surface-600">{{ pkg.description_html }}</pre>
          </div>
          <form v-else class="space-y-2" @submit.prevent="savePackage">
            <input v-model="editForm.name" type="text" class="w-full rounded border border-surface-300 px-2 py-1.5 text-sm" />
            <input v-model.number="editForm.default_unit_price" type="number" step="0.01" class="w-40 rounded border border-surface-300 px-2 py-1.5 text-sm" />
            <textarea v-model="editForm.description_html" rows="6" class="w-full rounded border border-surface-300 px-2 py-1.5 text-sm" />
            <label class="flex items-center gap-2 text-sm">
              <input v-model="editForm.active" type="checkbox" /> Active
            </label>
            <div class="flex gap-2">
              <button type="submit" class="rounded bg-primary-600 px-3 py-1.5 text-sm text-white" :disabled="savingPkg">Save</button>
              <button type="button" class="rounded border px-3 py-1.5 text-sm" @click="editingId = ''">Cancel</button>
            </div>
          </form>
        </li>
      </ul>
    </section>

    <details v-if="!compact" class="rounded-lg border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-600">
      <summary class="cursor-pointer font-medium text-surface-700">Legacy WooCommerce catalog (deprecated)</summary>
      <p class="mt-2">Woo sync is optional and not used for VMA proposals anymore.</p>
      <CrmProposalCatalogSettings title="Woo catalog (legacy)" :show-crm-link="false" :product-limit="5" class="mt-4" />
    </details>
  </section>
</template>

<script setup lang="ts">
import type { ProposalServicePackage, ProposalTemplateSettings } from '~/types'

const props = withDefaults(
  defineProps<{
    title?: string
    compact?: boolean
  }>(),
  { title: 'Service packages', compact: false },
)

const pending = ref(true)
const loadError = ref('')
const packages = ref<ProposalServicePackage[]>([])
const packageCount = ref<number | null>(null)
const seeding = ref(false)
const seedMessage = ref('')

const template = reactive<ProposalTemplateSettings>({
  intro_html: '',
  terms_html: '',
  currency: 'USD',
})
const savingTemplate = ref(false)
const templateMessage = ref('')
const templateError = ref('')

const showAdd = ref(false)
const creating = ref(false)
const createError = ref('')
const newForm = reactive({
  sku: '',
  name: '',
  description_html: '',
  default_unit_price: 0,
  billing_interval: 'month' as 'month' | 'year' | 'one_time',
  category: 'monthly_plan' as const,
})

const editingId = ref('')
const savingPkg = ref(false)
const editForm = reactive({
  name: '',
  description_html: '',
  default_unit_price: 0,
  active: true,
})

function authHeaders(): Record<string, string> {
  const pb = usePocketbase()
  return pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}
}

function formatMoney(n: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n)
  } catch {
    return String(n)
  }
}

async function load() {
  pending.value = true
  loadError.value = ''
  try {
    const data = await $fetch<{ packages: ProposalServicePackage[] }>('/api/crm/service-packages', {
      headers: authHeaders(),
    })
    packages.value = data.packages || []
    packageCount.value = packages.value.length
    if (!props.compact) {
      const t = await $fetch<{ template: ProposalTemplateSettings }>('/api/crm/proposal-template', {
        headers: authHeaders(),
      })
      template.intro_html = t.template.intro_html || ''
      template.terms_html = t.template.terms_html || ''
      template.currency = t.template.currency || 'USD'
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    loadError.value = err?.data?.message ?? err?.message ?? 'Failed to load packages'
    packageCount.value = 0
  } finally {
    pending.value = false
  }
}

async function runSeedVma() {
  seeding.value = true
  seedMessage.value = ''
  try {
    const data = await $fetch<{ created: number; updated: number; total: number }>('/api/crm/service-packages/seed-vma', {
      method: 'POST',
      headers: authHeaders(),
    })
    seedMessage.value = `Loaded VMA packages (${data.created} new, ${data.updated} updated, ${data.total} total).`
    await load()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    loadError.value = err?.data?.message ?? err?.message ?? 'Seed failed'
  } finally {
    seeding.value = false
  }
}

async function saveTemplate() {
  savingTemplate.value = true
  templateMessage.value = ''
  templateError.value = ''
  try {
    await $fetch('/api/crm/proposal-template', {
      method: 'PATCH',
      headers: authHeaders(),
      body: {
        intro_html: template.intro_html || null,
        terms_html: template.terms_html || null,
        currency: template.currency,
      },
    })
    templateMessage.value = 'Template saved.'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    templateError.value = err?.data?.message ?? err?.message ?? 'Save failed'
  } finally {
    savingTemplate.value = false
  }
}

async function createPackage() {
  creating.value = true
  createError.value = ''
  try {
    await $fetch('/api/crm/service-packages', {
      method: 'POST',
      headers: authHeaders(),
      body: { ...newForm, category: newForm.billing_interval === 'one_time' ? 'one_time_project' : 'monthly_plan' },
    })
    newForm.sku = ''
    newForm.name = ''
    newForm.description_html = ''
    newForm.default_unit_price = 0
    showAdd.value = false
    await load()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    createError.value = err?.data?.message ?? err?.message ?? 'Create failed'
  } finally {
    creating.value = false
  }
}

function startEdit(pkg: ProposalServicePackage) {
  editingId.value = pkg.id
  editForm.name = pkg.name
  editForm.description_html = pkg.description_html || ''
  editForm.default_unit_price = Number(pkg.default_unit_price) || 0
  editForm.active = pkg.active !== false
}

async function savePackage() {
  if (!editingId.value) return
  savingPkg.value = true
  try {
    await $fetch(`/api/crm/service-packages/${editingId.value}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: {
        name: editForm.name,
        description_html: editForm.description_html,
        default_unit_price: editForm.default_unit_price,
        active: editForm.active,
      },
    })
    editingId.value = ''
    await load()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    loadError.value = err?.data?.message ?? err?.message ?? 'Update failed'
  } finally {
    savingPkg.value = false
  }
}

async function removePackage(id: string) {
  if (!confirm('Remove this package from the catalog?')) return
  try {
    await $fetch(`/api/crm/service-packages/${id}`, { method: 'DELETE', headers: authHeaders() })
    await load()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    loadError.value = err?.data?.message ?? err?.message ?? 'Delete failed'
  }
}

onMounted(() => load())
</script>