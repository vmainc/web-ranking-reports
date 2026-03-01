<template>
  <div v-if="submitted" class="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">{{ successMessage || 'Thank you!' }}</div>
  <form v-else class="space-y-4" @submit.prevent="onSubmit">
    <div class="absolute -left-[9999px]" aria-hidden="true"><input v-model="honeypot" type="text" name="companyFax" tabindex="-1" autocomplete="off" /></div>
    <template v-for="(field, i) in (fields || [])" :key="field.key">
      <div v-show="isVisible(field)" :data-wrr-field="field.key" class="wrr-field">
        <label v-if="field.type !== 'hidden'" class="block text-sm font-medium text-surface-700">{{ field.label }} <span v-if="field.required">*</span></label>
        <input v-if="['text','email','phone','url'].includes(field.type)" v-model="payload[field.key]" :type="field.type === 'url' ? 'url' : field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'" :name="field.key" :required="field.required" :placeholder="field.placeholder" class="mt-1 block w-full rounded-lg border border-surface-300 px-3 py-2" />
        <textarea v-else-if="field.type === 'textarea'" v-model="payload[field.key]" :name="field.key" :required="field.required" :placeholder="field.placeholder" rows="3" class="mt-1 block w-full rounded-lg border border-surface-300 px-3 py-2" />
        <select v-else-if="field.type === 'select'" v-model="payload[field.key]" :name="field.key" :required="field.required" class="mt-1 block w-full rounded-lg border border-surface-300 px-3 py-2">
          <option value="">{{ field.placeholder || 'Select…' }}</option>
          <option v-for="opt in (field.options || [])" :key="opt.value" :value="opt.value">{{ opt.label || opt.value }}</option>
        </select>
        <template v-else-if="field.type === 'radio'">
          <div class="mt-1 space-y-2"><label v-for="opt in (field.options || [])" :key="opt.value" class="flex items-center gap-2"><input v-model="payload[field.key]" type="radio" :name="field.key" :value="opt.value" :required="field.required" class="rounded border-surface-300 text-primary-600" /><span>{{ opt.label || opt.value }}</span></label></div>
        </template>
        <template v-else-if="field.type === 'checkbox'">
          <div class="mt-1 space-y-2"><label v-for="opt in (field.options || [])" :key="opt.value" class="flex items-center gap-2"><input :checked="checkboxArr(field.key).includes(opt.value)" type="checkbox" :value="opt.value" class="rounded border-surface-300 text-primary-600" @change="toggleCheck(field.key, opt.value)" /><span>{{ opt.label || opt.value }}</span></label></div>
        </template>
        <input v-else-if="field.type === 'hidden'" v-model="payload[field.key]" type="hidden" :name="field.key" />
        <p v-if="field.helpText && field.type !== 'hidden'" class="mt-0.5 text-xs text-surface-500">{{ field.helpText }}</p>
      </div>
    </template>
    <div class="pt-2"><button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50" :disabled="submitting">{{ submitting ? 'Sending…' : 'Submit' }}</button></div>
    <p v-if="submitError" class="text-sm text-red-600">{{ submitError }}</p>
  </form>
</template>

<script setup lang="ts">
import type { LeadFormField, LeadFormCondition } from '~/types'
const props = defineProps<{ formId: string; fields: LeadFormField[]; conditional?: LeadFormCondition[] | null; successMessage?: string; redirectUrl?: string }>()
const payload = ref<Record<string, string | string[]>>({})
const honeypot = ref('')
const submitting = ref(false)
const submitError = ref('')
const submitted = ref(false)
const startedAt = ref(0)
onMounted(() => { startedAt.value = Date.now() })
const successMessage = computed(() => props.successMessage || 'Thank you!')
function isVisible(f: LeadFormField): boolean {
  const rules = props.conditional || []
  const r = rules.find(x => x.targetFieldKey === f.key)
  if (!r) return true
  const raw = payload.value[r.sourceFieldKey]
  const val = Array.isArray(raw) ? raw.join(',') : (raw ?? '')
  const s = String(val).trim()
  if (r.operator === 'equals') return s === (r.value || '')
  if (r.operator === 'contains') return s.indexOf(r.value || '') !== -1
  if (r.operator === 'notEmpty') return s.length > 0
  return true
}
function checkboxArr(k: string): string[] { const v = payload.value[k]; return Array.isArray(v) ? v : [] }
function toggleCheck(k: string, val: string) { const arr = checkboxArr(k); const i = arr.indexOf(val); if (i >= 0) arr.splice(i, 1); else arr.push(val); payload.value[k] = [...arr] }
function onSubmit() {
  if (honeypot.value) return
  submitError.value = ''
  submitting.value = true
  $fetch(`/api/forms/${props.formId}/submit`, { method: 'POST', body: { payload: { ...payload.value }, _startedAt: startedAt.value } })
    .then((data: { redirectUrl?: string; message?: string }) => { submitted.value = true; if (data.redirectUrl) window.location.href = data.redirectUrl })
    .catch((e: { data?: { message?: string }; message?: string }) => { submitError.value = e?.data?.message || e?.message || 'Something went wrong.'; submitting.value = false })
}
</script>
