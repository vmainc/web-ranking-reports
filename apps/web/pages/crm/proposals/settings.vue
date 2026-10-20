<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
    <div class="mb-6">
      <NuxtLink to="/crm/proposals" class="text-sm text-surface-500 hover:text-primary-600">← Proposals</NuxtLink>
      <h1 class="mt-2 text-2xl font-semibold text-surface-900">Proposal settings</h1>
      <p class="mt-1 text-sm text-surface-500">
        Service catalog, brand copy, and reusable templates for the proposal generator.
      </p>
    </div>

    <CrmSubNav />

    <div class="mt-6 space-y-8">
      <CrmProposalCatalogSettings title="Catalog site" :show-crm-link="false" :product-limit="50" />

      <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-surface-900">Brand & defaults</h2>
        <p class="mt-2 text-sm text-surface-500">
          Mission, vision, and closing copy pre-fill new proposals. Logo comes from your
          <NuxtLink to="/agency" class="text-primary-600 hover:underline">Agency branding</NuxtLink>
          settings (admin-editable).
        </p>
        <div v-if="brandPending" class="mt-6 text-sm text-surface-500">Loading…</div>
        <form v-else class="mt-6 space-y-4" @submit.prevent="saveBrand">
          <div>
            <label class="block text-sm font-medium text-surface-700">Mission</label>
            <textarea v-model="brandForm.mission" rows="3" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Vision</label>
            <textarea v-model="brandForm.vision" rows="3" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Closing statement</label>
            <input v-model="brandForm.closing_statement" type="text" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Default terms (new proposals)</label>
            <textarea v-model="brandForm.default_terms" rows="4" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
          </div>
          <p v-if="brandMessage" class="text-sm text-emerald-700">{{ brandMessage }}</p>
          <p v-if="brandError" class="text-sm text-red-600">{{ brandError }}</p>
          <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500" :disabled="brandSaving">
            {{ brandSaving ? 'Saving…' : 'Save brand defaults' }}
          </button>
        </form>
      </section>

      <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-lg font-semibold text-surface-900">Templates</h2>
          <button type="button" class="rounded-lg border border-surface-300 px-3 py-2 text-sm font-medium hover:bg-surface-50" @click="createTemplate">
            New template
          </button>
        </div>
        <p class="mt-2 text-sm text-surface-500">Start a proposal from a saved section outline and copy.</p>
        <div v-if="templatesPending" class="mt-6 text-sm text-surface-500">Loading…</div>
        <ul v-else class="mt-4 space-y-2">
          <li
            v-for="t in templates"
            :key="t.id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-100 px-3 py-2"
          >
            <div>
              <p class="font-medium text-surface-900">{{ t.name }}</p>
              <p v-if="t.description" class="text-xs text-surface-500">{{ t.description }}</p>
            </div>
            <div class="flex gap-2">
              <button type="button" class="text-xs text-red-600 hover:underline" @click="deleteTemplate(t.id)">Delete</button>
            </div>
          </li>
        </ul>
        <p v-if="!templates.length && !templatesPending" class="mt-4 text-sm text-surface-500">No templates yet.</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProposalTemplate } from '~/types'

definePageMeta({ layout: 'default' })

const brandPending = ref(true)
const brandSaving = ref(false)
const brandMessage = ref('')
const brandError = ref('')
const brandForm = reactive({
  mission: '',
  vision: '',
  closing_statement: '',
  default_terms: '',
})

const templates = ref<ProposalTemplate[]>([])
const templatesPending = ref(true)

function authHeaders(): Record<string, string> {
  const pb = usePocketbase()
  return pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}
}

async function loadBrand() {
  brandPending.value = true
  try {
    const data = await $fetch<{ settings: { brand: typeof brandForm } }>('/api/crm/proposal-settings', {
      headers: authHeaders(),
    })
    Object.assign(brandForm, data.settings.brand)
  } finally {
    brandPending.value = false
  }
}

async function saveBrand() {
  brandSaving.value = true
  brandMessage.value = ''
  brandError.value = ''
  try {
    await $fetch('/api/crm/proposal-settings', {
      method: 'PATCH',
      headers: authHeaders(),
      body: { brand: { ...brandForm } },
    })
    brandMessage.value = 'Brand defaults saved.'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    brandError.value = err?.data?.message ?? err?.message ?? 'Save failed'
  } finally {
    brandSaving.value = false
  }
}

async function loadTemplates() {
  templatesPending.value = true
  try {
    const data = await $fetch<{ templates: ProposalTemplate[] }>('/api/crm/proposal-templates', {
      headers: authHeaders(),
    })
    templates.value = data.templates || []
  } catch {
    templates.value = []
  } finally {
    templatesPending.value = false
  }
}

async function createTemplate() {
  const name = window.prompt('Template name')
  if (!name?.trim()) return
  await $fetch('/api/crm/proposal-templates', {
    method: 'POST',
    headers: authHeaders(),
    body: { name: name.trim() },
  })
  await loadTemplates()
}

async function deleteTemplate(id: string) {
  if (!window.confirm('Delete this template?')) return
  await $fetch(`/api/crm/proposal-templates/${id}`, { method: 'DELETE', headers: authHeaders() })
  await loadTemplates()
}

onMounted(() => {
  void loadBrand()
  void loadTemplates()
})
</script>
