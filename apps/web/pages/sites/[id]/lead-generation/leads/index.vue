<template>
  <LeadGenerationLayout>
    <div class="space-y-6">
      <h2 class="text-lg font-semibold text-surface-900">Leads</h2>
      <div class="flex flex-wrap gap-4">
        <input v-model="search" type="search" placeholder="Search…" class="rounded-lg border border-surface-300 px-3 py-2 text-sm" />
        <select v-model="filterFormId" class="rounded-lg border border-surface-300 px-3 py-2 text-sm">
          <option value="">All forms</option>
          <option v-for="f in forms" :key="f.id" :value="f.id">{{ f.name }}</option>
        </select>
        <select v-model="filterStatus" class="rounded-lg border border-surface-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="processing">Processing</option>
          <option value="ready">Ready</option>
          <option value="error">Error</option>
        </select>
        <button type="button" class="rounded-lg bg-surface-100 px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-200" @click="load">Apply</button>
      </div>
      <div v-if="pending" class="rounded-2xl border border-surface-200 bg-white p-8 text-center text-surface-500">Loading leads…</div>
      <div v-else-if="!leads.length" class="rounded-2xl border border-surface-200 bg-white p-8 text-center text-surface-500">No leads match.</div>
      <div v-else class="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm">
        <table class="min-w-full divide-y divide-surface-200">
          <thead class="bg-surface-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Name</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Email</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-surface-500">Submitted</th>
              <th class="px-4 py-3 text-right text-xs font-medium uppercase text-surface-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-200 bg-white">
            <tr v-for="lead in leads" :key="lead.id" class="hover:bg-surface-50/50">
              <td class="px-4 py-3 font-medium text-surface-900">{{ lead.lead_name || '—' }}</td>
              <td class="px-4 py-3 text-surface-600">{{ lead.lead_email || '—' }}</td>
              <td class="px-4 py-3"><span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusClass(lead.status)">{{ lead.status }}</span></td>
              <td class="px-4 py-3 text-sm text-surface-500">{{ formatDate(lead.submitted_at) }}</td>
              <td class="px-4 py-3 text-right"><NuxtLink :to="`/sites/${siteId}/lead-generation/leads/${lead.id}`" class="text-primary-600 hover:underline">View</NuxtLink></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </LeadGenerationLayout>
</template>

<script setup lang="ts">
import type { LeadForm, LeadSubmission } from '~/types'
const route = useRoute()
const pb = usePocketbase()
const siteId = computed(() => route.params.id as string)
const forms = ref<LeadForm[]>([])
const leads = ref<LeadSubmission[]>([])
const pending = ref(true)
const search = ref('')
const filterFormId = ref('')
const filterStatus = ref('')
function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
function statusClass(s: string) {
  const m: Record<string, string> = { new: 'bg-blue-100 text-blue-800', processing: 'bg-amber-100 text-amber-800', ready: 'bg-green-100 text-green-800', error: 'bg-red-100 text-red-800', archived: 'bg-surface-100 text-surface-600' }
  return m[s] || 'bg-surface-100 text-surface-600'
}
function formatDate(iso: string) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) } catch { return iso }
}
async function loadForms() {
  try {
    const data = await $fetch<{ forms: LeadForm[] }>(`/api/sites/${siteId.value}/lead-forms/list`, { headers: authHeaders() })
    forms.value = data.forms || []
  } catch { forms.value = [] }
}
async function load() {
  pending.value = true
  try {
    const q: Record<string, string> = {}
    if (filterFormId.value) q.formId = filterFormId.value
    if (filterStatus.value) q.status = filterStatus.value
    if (search.value.trim()) q.search = search.value.trim()
    const data = await $fetch<{ leads: LeadSubmission[] }>(`/api/sites/${siteId.value}/leads/list`, { headers: authHeaders(), query: q })
    leads.value = data.leads || []
  } catch { leads.value = [] }
  finally { pending.value = false }
}
onMounted(() => { loadForms(); load() })
watch([siteId, filterFormId, filterStatus], () => load())
</script>
