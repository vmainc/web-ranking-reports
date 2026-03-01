<template>
  <div class="space-y-8">
    <div class="rounded-2xl border border-surface-200 bg-white p-6">
      <h3 class="mb-4 text-sm font-semibold text-surface-900">Form details</h3>
      <div class="grid gap-4 sm:grid-cols-2">
        <div><label class="block text-sm font-medium text-surface-700">Name</label><input v-model="localName" type="text" class="mt-1 block w-full rounded-lg border border-surface-300 px-3 py-2" placeholder="e.g. Contact form" /></div>
        <div><label class="block text-sm font-medium text-surface-700">Status</label><select v-model="localStatus" class="mt-1 block w-full rounded-lg border border-surface-300 px-3 py-2"><option value="draft">Draft</option><option value="published">Published</option></select></div>
      </div>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <div><label class="block text-sm font-medium text-surface-700">Success message</label><input v-model="localSettings.successMessage" type="text" class="mt-1 block w-full rounded-lg border border-surface-300 px-3 py-2" placeholder="Thank you!" /></div>
        <div><label class="block text-sm font-medium text-surface-700">Redirect URL (optional)</label><input v-model="localSettings.redirectUrl" type="url" class="mt-1 block w-full rounded-lg border border-surface-300 px-3 py-2" placeholder="https://..." /></div>
      </div>
      <div class="mt-4"><label class="flex items-center gap-2"><input v-model="localSettings.notifyEmail" type="checkbox" class="rounded border-surface-300 text-primary-600" /><span class="text-sm font-medium text-surface-700">Email on new submission</span></label></div>
    </div>
    <div class="rounded-2xl border border-surface-200 bg-white p-6">
      <div class="mb-4 flex items-center justify-between"><h3 class="text-sm font-semibold text-surface-900">Fields</h3><button type="button" class="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-500" @click="addField">Add field</button></div>
      <div class="space-y-4">
        <div v-for="(field, index) in localFields" :key="index" class="rounded-xl border border-surface-200 bg-surface-50/50 p-4">
          <div class="mb-3 flex justify-between"><span class="text-sm font-medium text-surface-700">{{ field.label || field.key || 'Field' }}</span><button type="button" class="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50" @click="removeField(index)">Remove</button></div>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><label class="block text-xs font-medium text-surface-500">Label</label><input v-model="field.label" type="text" class="mt-0.5 block w-full rounded border border-surface-300 px-2 py-1.5 text-sm" placeholder="Label" /></div>
            <div><label class="block text-xs font-medium text-surface-500">Key (slug)</label><input v-model="field.key" type="text" class="mt-0.5 block w-full rounded border border-surface-300 px-2 py-1.5 text-sm font-mono" placeholder="field_key" /></div>
            <div><label class="block text-xs font-medium text-surface-500">Type</label><select v-model="field.type" class="mt-0.5 block w-full rounded border border-surface-300 px-2 py-1.5 text-sm"><option value="text">Text</option><option value="email">Email</option><option value="phone">Phone</option><option value="url">URL</option><option value="textarea">Textarea</option><option value="checkbox">Checkbox</option><option value="radio">Radio</option><option value="select">Select</option><option value="hidden">Hidden</option></select></div>
            <div class="flex items-end"><label class="flex items-center gap-2"><input v-model="field.required" type="checkbox" class="rounded border-surface-300 text-primary-600" /><span class="text-xs text-surface-600">Required</span></label></div>
          </div>
          <div v-if="field.type !== 'hidden'" class="mt-3 grid gap-3 sm:grid-cols-2"><div><label class="block text-xs font-medium text-surface-500">Placeholder</label><input v-model="field.placeholder" type="text" class="mt-0.5 block w-full rounded border border-surface-300 px-2 py-1.5 text-sm" /></div><div><label class="block text-xs font-medium text-surface-500">Help text</label><input v-model="field.helpText" type="text" class="mt-0.5 block w-full rounded border border-surface-300 px-2 py-1.5 text-sm" /></div></div>
          <div v-if="['checkbox','radio','select'].includes(field.type)" class="mt-3"><label class="block text-xs font-medium text-surface-500">Options (one per line: value or value|label)</label><textarea :value="optionsText(field)" class="mt-0.5 block w-full rounded border border-surface-300 px-2 py-1.5 text-sm font-mono" rows="3" placeholder="opt1&#10;opt2|Label" @input="e => setOptionsFromText(field, (e.target as HTMLTextAreaElement).value)" /></div>
        </div>
      </div>
    </div>
    <div class="rounded-2xl border border-surface-200 bg-white p-6">
      <h3 class="mb-4 text-sm font-semibold text-surface-900">Conditional logic (JSON)</h3>
      <textarea :value="conditionalText" class="block w-full rounded-lg border border-surface-300 px-3 py-2 font-mono text-sm" rows="4" placeholder='[{"targetFieldKey":"x","sourceFieldKey":"y","operator":"equals","value":"z"}]' @input="e => { conditionalText = (e.target as HTMLTextAreaElement).value; emitCond() }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LeadFormField, LeadFormCondition } from '~/types'
const props = defineProps<{ name: string; status: 'draft' | 'published'; fields: LeadFormField[]; conditional: LeadFormCondition[] | null; settings: { successMessage?: string; redirectUrl?: string; notifyEmail?: boolean } | null }>()
const emit = defineEmits<{ (e: 'update:name', v: string): void; (e: 'update:status', v: 'draft' | 'published'): void; (e: 'update:fields', v: LeadFormField[]): void; (e: 'update:conditional', v: LeadFormCondition[]): void; (e: 'update:settings', v: Record<string, unknown>): void }>()
const localName = computed({ get: () => props.name, set: v => emit('update:name', v) })
const localStatus = computed({ get: () => props.status, set: v => emit('update:status', v as 'draft' | 'published') })
const localFields = ref<LeadFormField[]>([])
watch(() => props.fields, v => { localFields.value = (v?.length ? [...v] : []) }, { immediate: true })
watch(localFields, v => emit('update:fields', v), { deep: true })
const defaultSettings = { successMessage: 'Thank you!', redirectUrl: '', notifyEmail: false }
const localSettings = ref<{ successMessage: string; redirectUrl: string; notifyEmail: boolean }>({ ...defaultSettings, ...props.settings })
watch(() => props.settings, s => { localSettings.value = { ...defaultSettings, ...s } }, { immediate: true })
watch(localSettings, v => emit('update:settings', { ...v }), { deep: true })
const conditionalText = ref('')
watch(() => props.conditional, v => { try { conditionalText.value = v?.length ? JSON.stringify(v, null, 2) : '' } catch { conditionalText.value = '' } }, { immediate: true })
function emitCond() { try { const p = JSON.parse(conditionalText.value || '[]') as LeadFormCondition[]; if (Array.isArray(p)) emit('update:conditional', p) } catch {} }
function addField() { localFields.value.push({ key: 'field_' + Date.now(), type: 'text', label: 'New field', required: false, placeholder: '', helpText: '' }) }
function removeField(i: number) { localFields.value.splice(i, 1) }
function optionsText(f: LeadFormField): string { return (f.options || []).map(o => (o.label && o.label !== o.value ? o.value + '|' + o.label : o.value)).join('\n') }
function setOptionsFromText(f: LeadFormField, text: string) { const lines = text.split('\n').map(s => s.trim()).filter(Boolean); f.options = lines.map(line => { const pipe = line.indexOf('|'); if (pipe > 0) return { value: line.slice(0, pipe).trim(), label: line.slice(pipe + 1).trim() }; return { value: line, label: line } }); emit('update:fields', [...localFields.value]) }
</script>
