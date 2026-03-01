<template>
  <LeadGenerationLayout>
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h2 class="text-lg font-semibold text-surface-900">Forms</h2>
        <NuxtLink :to="`/sites/${siteId}/lead-generation/forms/new`" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500">Create form</NuxtLink>
      </div>
      <div v-if="pending" class="rounded-2xl border border-surface-200 bg-white p-8 text-center text-surface-500">Loading forms…</div>
      <div v-else-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{{ error }}</div>
      <div v-else-if="!forms.length" class="rounded-2xl border border-surface-200 bg-white p-8 text-center">
        <p class="text-surface-500">No forms yet.</p>
        <NuxtLink :to="`/sites/${siteId}/lead-generation/forms/new`" class="mt-4 inline-block text-primary-600 hover:underline">Create your first form</NuxtLink>
      </div>
      <div v-else class="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm">
        <table class="min-w-full divide-y divide-surface-200">
          <thead class="bg-surface-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500">Name</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500">Updated</th>
              <th class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-surface-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-200 bg-white">
            <tr v-for="form in forms" :key="form.id" class="hover:bg-surface-50/50">
              <td class="px-4 py-3">
                <NuxtLink :to="`/sites/${siteId}/lead-generation/forms/${form.id}`" class="font-medium text-surface-900 hover:text-primary-600">{{ form.name || 'Untitled' }}</NuxtLink>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium" :class="form.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-surface-100 text-surface-600'">{{ form.status }}</span>
              </td>
              <td class="px-4 py-3 text-sm text-surface-500">{{ formatDate(form.updated) }}</td>
              <td class="px-4 py-3 text-right">
                <NuxtLink :to="`/sites/${siteId}/lead-generation/forms/${form.id}`" class="text-primary-600 hover:underline">Edit</NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </LeadGenerationLayout>
</template>

<script setup lang="ts">
import type { LeadForm } from '~/types'
const route = useRoute()
const pb = usePocketbase()
const siteId = computed(() => route.params.id as string)
const forms = ref<LeadForm[]>([])
const pending = ref(true)
const error = ref('')
function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
function formatDate(iso: string) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'short' }) } catch { return iso }
}
async function load() {
  pending.value = true
  error.value = ''
  try {
    const data = await $fetch<{ forms: LeadForm[] }>(`/api/sites/${siteId.value}/lead-forms/list`, { headers: authHeaders() })
    forms.value = data.forms || []
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string }; message?: string })?.data?.message || (e as Error).message || 'Failed to load forms'
  } finally {
    pending.value = false
  }
}
onMounted(() => load())
watch(siteId, () => load())
</script>
