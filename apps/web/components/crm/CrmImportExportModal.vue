<template>
  <CrmModal
    v-model="open"
    :title="mode === 'import' ? 'Import contacts' : 'Export contacts'"
    content-class="max-w-3xl"
  >
    <div v-if="mode === 'export'" class="space-y-3">
      <p class="text-sm text-surface-600">
        Download a CSV using your current filters
        <span v-if="exportCount != null">({{ exportCount }} contact{{ exportCount === 1 ? '' : 's' }} visible)</span>.
      </p>
      <p class="text-sm text-surface-500">
        Includes names, email, phones, company, status, address, tags, and last contact date.
      </p>
    </div>

    <template v-else>
      <div v-if="step === 'upload'" class="space-y-4">
        <p class="text-sm text-surface-600">
          Upload a CSV. Claude will suggest how your columns map to contact fields—you can adjust before importing.
        </p>
        <label
          class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-surface-300 bg-surface-50 px-6 py-10 transition hover:border-primary-400 hover:bg-primary-50/30"
          :class="{ 'pointer-events-none opacity-60': analyzing }"
        >
          <input ref="fileInput" type="file" accept=".csv,text/csv" class="sr-only" :disabled="analyzing" @change="onFileSelected" />
          <span v-if="analyzing" class="text-sm font-medium text-surface-800">Analyzing columns…</span>
          <template v-else>
            <span class="text-sm font-medium text-surface-800">Choose CSV file</span>
            <span class="mt-1 text-xs text-surface-500">Up to 2,000 rows</span>
          </template>
        </label>
        <p v-if="fileError" class="text-sm text-red-600">{{ fileError }}</p>
      </div>

      <div v-else-if="step === 'mapping'" class="space-y-4">
        <div
          v-if="analyzeNotes"
          class="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900"
        >
          {{ analyzeNotes }}
          <span v-if="usedAi" class="ml-1 text-xs text-primary-700">(AI-assisted)</span>
        </div>
        <p class="text-sm text-surface-600">
          {{ parsedRows.length }} row{{ parsedRows.length === 1 ? '' : 's' }} detected. Match each field to a column from your file.
        </p>
        <div class="max-h-[min(50vh,420px)] overflow-y-auto rounded-lg border border-surface-200">
          <table class="min-w-full text-left text-sm">
            <thead class="sticky top-0 bg-surface-100 text-xs uppercase text-surface-500">
              <tr>
                <th class="px-3 py-2 font-medium">Contact field</th>
                <th class="px-3 py-2 font-medium">Your column</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-100">
              <tr v-for="field in CRM_IMPORT_FIELDS" :key="field.id">
                <td class="px-3 py-2 align-top">
                  <span class="font-medium text-surface-800">{{ field.label }}</span>
                  <p v-if="field.hint" class="text-xs text-surface-500">{{ field.hint }}</p>
                </td>
                <td class="px-3 py-2">
                  <select
                    v-model="mapping[field.id]"
                    class="w-full rounded-lg border border-surface-300 px-2 py-1.5 text-sm"
                  >
                    <option :value="null">— Skip —</option>
                    <option v-for="h in parsedHeaders" :key="h" :value="h">{{ h }}</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-surface-700">Default status</label>
            <select v-model="defaultStatus" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
              <option value="lead">Lead</option>
              <option value="client">Customer</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div class="flex items-end pb-1">
            <label class="flex items-center gap-2 text-sm text-surface-700">
              <input v-model="skipDuplicates" type="checkbox" class="rounded border-surface-300" />
              Skip rows with duplicate email
            </label>
          </div>
        </div>
      </div>

      <div v-else-if="step === 'preview'" class="space-y-3">
        <p class="text-sm text-surface-600">Preview of the first rows to import:</p>
        <div class="overflow-x-auto rounded-lg border border-surface-200">
          <table class="min-w-full text-left text-xs">
            <thead class="bg-surface-100 text-surface-500">
              <tr>
                <th class="px-2 py-2">Name</th>
                <th class="px-2 py-2">Email</th>
                <th class="px-2 py-2">Company</th>
                <th class="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-100">
              <tr v-for="(row, i) in previewRows" :key="i">
                <td class="px-2 py-2">{{ row.name }}</td>
                <td class="px-2 py-2">{{ row.email || '—' }}</td>
                <td class="px-2 py-2">{{ row.company || '—' }}</td>
                <td class="px-2 py-2">{{ row.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="invalidRowCount > 0" class="text-xs text-amber-700">
          {{ invalidRowCount }} row{{ invalidRowCount === 1 ? '' : 's' }} will be skipped (no name).
        </p>
      </div>

      <div v-else-if="step === 'done'" class="space-y-3 py-4 text-center">
        <p class="text-lg font-semibold text-surface-900">Import complete</p>
        <p class="text-sm text-surface-600">
          Created <strong>{{ importResult?.created ?? 0 }}</strong> contact{{ (importResult?.created ?? 0) === 1 ? '' : 's' }}.
          <span v-if="(importResult?.skipped ?? 0) > 0">
            Skipped {{ importResult?.skipped }} (duplicates or invalid rows).
          </span>
        </p>
        <ul v-if="importResult?.errors?.length" class="mx-auto mt-2 max-h-32 max-w-md overflow-y-auto text-left text-xs text-red-600">
          <li v-for="(err, i) in importResult.errors" :key="i">{{ err }}</li>
        </ul>
      </div>

      <p v-if="importError" class="text-sm text-red-600">{{ importError }}</p>
    </template>

    <template #footer>
      <div v-if="mode === 'export'" class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50"
          @click="open = false"
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
          :disabled="exporting"
          @click="runExport"
        >
          {{ exporting ? 'Preparing…' : 'Download CSV' }}
        </button>
      </div>

      <div v-else class="flex w-full flex-wrap justify-between gap-2">
        <button
          v-if="step !== 'upload' && step !== 'done'"
          type="button"
          class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50"
          @click="goBack"
        >
          Back
        </button>
        <span v-else />
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50"
            @click="open = false"
          >
            {{ step === 'done' ? 'Close' : 'Cancel' }}
          </button>
          <button
            v-if="step === 'mapping'"
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
            @click="step = 'preview'"
          >
            Preview
          </button>
          <button
            v-if="step === 'preview'"
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="importing || validRowCount === 0"
            @click="runImport"
          >
            {{ importing ? 'Importing…' : `Import ${validRowCount} contact${validRowCount === 1 ? '' : 's'}` }}
          </button>
        </div>
      </div>
    </template>
  </CrmModal>
</template>

<script setup lang="ts">
import {
  CRM_IMPORT_FIELDS,
  mapRowToContact,
  parseCsv,
  type CrmColumnMapping,
} from '~/lib/crmImportExport'

const props = defineProps<{
  modelValue: boolean
  mode: 'import' | 'export'
  exportQuery?: { status?: string; pipeline_stage?: string; search?: string }
  exportCount?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  imported: []
}>()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const pb = usePocketbase()
function authHeaders(): Record<string, string> {
  return pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}
}

const step = ref<'upload' | 'mapping' | 'preview' | 'done'>('upload')
const fileInput = ref<HTMLInputElement | null>(null)
const fileError = ref('')
const parsedHeaders = ref<string[]>([])
const parsedRows = ref<Record<string, string>[]>([])
const mapping = reactive<CrmColumnMapping>({})
const analyzeNotes = ref('')
const usedAi = ref(false)
const defaultStatus = ref<'lead' | 'client' | 'archived'>('lead')
const skipDuplicates = ref(true)
const analyzing = ref(false)
const importing = ref(false)
const importError = ref('')
const importResult = ref<{ created: number; skipped: number; errors: string[] } | null>(null)
const exporting = ref(false)

watch(
  () => [open.value, props.mode] as const,
  ([isOpen, mode]) => {
    if (isOpen && mode === 'import') resetImport()
  },
)

function resetImport() {
  step.value = 'upload'
  fileError.value = ''
  parsedHeaders.value = []
  parsedRows.value = []
  analyzeNotes.value = ''
  usedAi.value = false
  importError.value = ''
  importResult.value = null
  for (const f of CRM_IMPORT_FIELDS) {
    mapping[f.id] = null
  }
  if (fileInput.value) fileInput.value.value = ''
}

async function onFileSelected(e: Event) {
  fileError.value = ''
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    fileError.value = 'File must be under 5MB.'
    return
  }
  const text = await file.text()
  const parsed = parseCsv(text)
  if (!parsed.headers.length) {
    fileError.value = 'Could not read column headers from this file.'
    return
  }
  if (!parsed.rows.length) {
    fileError.value = 'No data rows found.'
    return
  }
  if (parsed.rows.length > 2000) {
    fileError.value = 'Maximum 2,000 rows per import.'
    return
  }
  parsedHeaders.value = parsed.headers
  parsedRows.value = parsed.rows
  analyzing.value = true
  try {
    const res = await $fetch<{
      mapping: CrmColumnMapping
      notes?: string
      usedAi?: boolean
    }>('/api/crm/import/analyze', {
      method: 'POST',
      headers: authHeaders(),
      body: { headers: parsed.headers, rows: parsed.rows },
    })
    for (const f of CRM_IMPORT_FIELDS) {
      mapping[f.id] = res.mapping?.[f.id] ?? null
    }
    analyzeNotes.value = res.notes ?? ''
    usedAi.value = res.usedAi === true
    step.value = 'mapping'
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    fileError.value = e?.data?.message ?? e?.message ?? 'Could not analyze file.'
  } finally {
    analyzing.value = false
  }
}

const previewRows = computed(() =>
  parsedRows.value
    .slice(0, 8)
    .map((row) => mapRowToContact(row, mapping, { status: defaultStatus.value }))
    .filter((r): r is NonNullable<typeof r> => r != null),
)

const validRowCount = computed(
  () =>
    parsedRows.value.filter((row) => mapRowToContact(row, mapping, { status: defaultStatus.value }) != null).length,
)

const invalidRowCount = computed(() => parsedRows.value.length - validRowCount.value)

function goBack() {
  if (step.value === 'preview') step.value = 'mapping'
  else if (step.value === 'mapping') step.value = 'upload'
}

async function runImport() {
  importError.value = ''
  importing.value = true
  try {
    importResult.value = await $fetch('/api/crm/import/execute', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        rows: parsedRows.value,
        mapping,
        defaultStatus: defaultStatus.value,
        skipDuplicates: skipDuplicates.value,
      },
    })
    step.value = 'done'
    emit('imported')
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    importError.value = e?.data?.message ?? e?.message ?? 'Import failed.'
  } finally {
    importing.value = false
  }
}

async function runExport() {
  exporting.value = true
  try {
    const q = new URLSearchParams()
    if (props.exportQuery?.status) q.set('status', props.exportQuery.status)
    if (props.exportQuery?.pipeline_stage) q.set('pipeline_stage', props.exportQuery.pipeline_stage)
    if (props.exportQuery?.search) q.set('search', props.exportQuery.search)
    const qs = q.toString()
    const url = `/api/crm/clients/export${qs ? `?${qs}` : ''}`
    const blob = await $fetch<Blob>(url, { headers: authHeaders(), responseType: 'blob' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `crm-contacts-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    open.value = false
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    alert(e?.data?.message ?? e?.message ?? 'Export failed.')
  } finally {
    exporting.value = false
  }
}
</script>
