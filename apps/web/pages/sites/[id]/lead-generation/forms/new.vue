<template>
  <LeadGenerationLayout>
    <div class="space-y-6">
      <NuxtLink :to="`/sites/${siteId}/lead-generation/forms`" class="text-sm font-medium text-surface-500 hover:text-primary-600">← Back to forms</NuxtLink>
      <h2 class="text-xl font-semibold text-surface-900">New form</h2>
      <FormBuilder v-model:name="name" v-model:status="status" v-model:fields="fields" v-model:conditional="conditional" v-model:settings="settings" />
      <div class="flex gap-3">
        <button type="button" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50" :disabled="saving" @click="save">{{ saving ? 'Creating…' : 'Create form' }}</button>
        <NuxtLink :to="`/sites/${siteId}/lead-generation/forms`" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50">Cancel</NuxtLink>
      </div>
    </div>
  </LeadGenerationLayout>
</template>

<script setup lang="ts">
import type { LeadFormField, LeadFormCondition } from '~/types'
const route = useRoute()
const pb = usePocketbase()
const siteId = computed(() => route.params.id as string)
const name = ref('Untitled form')
const status = ref<'draft' | 'published'>('draft')
const fields = ref<LeadFormField[]>([])
const conditional = ref<LeadFormCondition[]>([])
const settings = ref<Record<string, unknown>>({})
const saving = ref(false)
function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
async function save() {
  saving.value = true
  try {
    const form = await $fetch<{ id: string }>(`/api/sites/${siteId.value}/lead-forms/create`, { method: 'POST', headers: authHeaders(), body: { name: name.value, status: status.value, fields_json: fields.value, conditional_json: conditional.value, settings_json: settings.value } })
    await navigateTo(`/sites/${siteId.value}/lead-generation/forms/${form.id}`)
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message || (e as Error).message || 'Failed to create form')
  } finally {
    saving.value = false
  }
}
</script>
