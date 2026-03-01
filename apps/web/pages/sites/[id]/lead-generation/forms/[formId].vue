<template>
  <LeadGenerationLayout>
    <div v-if="pending" class="py-8 text-center text-surface-500">Loading form…</div>
    <template v-else-if="form">
      <div class="space-y-6">
        <NuxtLink :to="`/sites/${siteId}/lead-generation/forms`" class="text-sm font-medium text-surface-500 hover:text-primary-600">← Back to forms</NuxtLink>
        <h2 class="text-xl font-semibold text-surface-900">{{ form.name || 'Edit form' }}</h2>
        <FormBuilder v-model:name="localName" v-model:status="localStatus" v-model:fields="localFields" v-model:conditional="localConditional" v-model:settings="localSettings" />
        <div class="flex gap-3">
          <button type="button" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50" :disabled="saving" @click="save">{{ saving ? 'Saving…' : 'Save' }}</button>
          <NuxtLink :to="`/sites/${siteId}/lead-generation/forms`" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50">Cancel</NuxtLink>
        </div>
      </div>
    </template>
    <div v-else class="py-8 text-center text-surface-500">Form not found.</div>
  </LeadGenerationLayout>
</template>

<script setup lang="ts">
import type { LeadForm, LeadFormField, LeadFormCondition } from '~/types'
const route = useRoute()
const pb = usePocketbase()
const siteId = computed(() => route.params.id as string)
const formId = computed(() => route.params.formId as string)
const form = ref<LeadForm | null>(null)
const pending = ref(true)
const saving = ref(false)
const localName = ref('')
const localStatus = ref<'draft' | 'published'>('draft')
const localFields = ref<LeadFormField[]>([])
const localConditional = ref<LeadFormCondition[]>([])
const localSettings = ref<Record<string, unknown>>({})
function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
async function load() {
  pending.value = true
  try {
    const data = await $fetch<LeadForm>(`/api/sites/${siteId.value}/lead-forms/${formId.value}`, { headers: authHeaders() })
    form.value = data
    localName.value = data.name || ''
    localStatus.value = data.status || 'draft'
    localFields.value = Array.isArray(data.fields_json) ? [...data.fields_json] : []
    localConditional.value = Array.isArray(data.conditional_json) ? [...data.conditional_json] : []
    localSettings.value = data.settings_json && typeof data.settings_json === 'object' ? { ...data.settings_json } : {}
  } catch {
    form.value = null
  } finally {
    pending.value = false
  }
}
async function save() {
  saving.value = true
  try {
    await $fetch(`/api/sites/${siteId.value}/lead-forms/${formId.value}`, { method: 'PATCH', headers: authHeaders(), body: { name: localName.value, status: localStatus.value, fields_json: localFields.value, conditional_json: localConditional.value, settings_json: localSettings.value } })
    await load()
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message || (e as Error).message || 'Failed to save')
  } finally {
    saving.value = false
  }
}
onMounted(() => load())
watch(formId, () => load())
</script>
