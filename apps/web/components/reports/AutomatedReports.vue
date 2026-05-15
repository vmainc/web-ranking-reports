<template>
  <div class="space-y-6">
    <section class="rounded-xl border border-slate-700/60 bg-slate-900/50 shadow-lg ring-1 ring-white/[0.03]">
      <div class="flex flex-col gap-3 border-b border-slate-700/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-lg font-semibold text-white">Automated reports</h3>
          <p class="mt-0.5 text-sm text-slate-400">Scheduled ranking snapshots emailed on your chosen cadence.</p>
        </div>
        <button
          v-if="!showCreateForm"
          type="button"
          class="inline-flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-[#22c55e] to-[#3b82f6] px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:brightness-110"
          @click="showCreateForm = true"
        >
          + New automated report
        </button>
      </div>

      <div v-if="pending" class="px-6 py-12 text-center text-sm text-slate-500">Loading…</div>
      <div v-else-if="!filteredSchedules.length" class="px-6 py-12 text-center">
        <p class="text-slate-300">No automated reports yet.</p>
        <p class="mt-1 text-sm text-slate-500">Create a schedule to send ranking snapshots automatically.</p>
        <button
          v-if="!showCreateForm"
          type="button"
          class="mt-4 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#22c55e] to-[#3b82f6] px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm hover:brightness-110"
          @click="showCreateForm = true"
        >
          + New automated report
        </button>
      </div>
      <div v-else>
        <p v-if="reports.length > 1" class="border-b border-slate-700/50 px-6 py-3 text-sm text-slate-400">
          <label class="mr-2 font-medium text-slate-300">Filter by report</label>
          <select v-model="reportFilter" class="mt-1 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white sm:mt-0">
            <option value="">All reports</option>
            <option v-for="r in reports" :key="r.id" :value="r.id">{{ reportDisplayName(r) }}</option>
          </select>
        </p>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-700/50">
            <thead class="bg-slate-800/80">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Report</th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Site</th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Frequency</th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Next run</th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Last run</th>
                <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/50">
              <tr v-for="row in filteredSchedules" :key="row.id" class="transition hover:bg-slate-800/40">
                <td class="px-6 py-4 text-sm font-medium text-white">{{ row.expand?.report ? reportDisplayName(row.expand.report) : '—' }}</td>
                <td class="px-6 py-4 text-sm text-slate-300">{{ row.expand?.site?.name ?? '—' }}</td>
                <td class="px-6 py-4 text-sm capitalize text-slate-300">{{ row.frequency }}</td>
                <td class="px-6 py-4 text-sm text-slate-300">{{ formatDateTime(row.next_run_at) }}</td>
                <td class="px-6 py-4 text-sm text-slate-300">{{ row.last_run_at ? formatDateTime(row.last_run_at) : '—' }}</td>
                <td class="whitespace-nowrap px-6 py-4 text-right text-sm">
                  <span class="inline-flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                    <button type="button" class="text-blue-400 hover:text-blue-300 hover:underline" :disabled="mutatingId === row.id" @click="openEdit(row)">
                      Edit
                    </button>
                    <span class="text-slate-600">|</span>
                    <button
                      v-if="row.is_active !== false"
                      type="button"
                      class="text-slate-400 hover:text-slate-200 hover:underline"
                      :disabled="mutatingId === row.id"
                      @click="togglePause(row, false)"
                    >
                      Pause
                    </button>
                    <button
                      v-else
                      type="button"
                      class="text-blue-400 hover:text-blue-300 hover:underline"
                      :disabled="mutatingId === row.id"
                      @click="togglePause(row, true)"
                    >
                      Resume
                    </button>
                    <span class="text-slate-600">|</span>
                    <button
                      type="button"
                      class="text-rose-400 hover:text-rose-300 hover:underline"
                      :disabled="mutatingId === row.id"
                      @click="confirmDelete(row)"
                    >
                      Delete
                    </button>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p v-if="error" class="border-t border-slate-700/50 px-6 py-3 text-sm text-rose-400">{{ error }}</p>
    </section>

    <section v-if="showCreateForm" class="schedule-form-panel rounded-xl border border-slate-700/60 bg-slate-900 p-6 shadow-lg ring-1 ring-white/[0.03]">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 class="text-base font-semibold text-white">New automated report</h3>
          <p class="mt-1 text-sm text-slate-400">Choose a report, recipients, and how often to send.</p>
        </div>
        <button
          type="button"
          class="shrink-0 text-sm font-medium text-slate-400 hover:text-white"
          aria-label="Close"
          @click="closeCreateForm"
        >
          ✕
        </button>
      </div>
      <div class="max-w-md">
        <ReportsScheduleForm :reports="reports" @created="onScheduleCreated" @cancel="closeCreateForm" />
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="scheduleToEdit"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="scheduleToEdit = null"
      >
        <div class="schedule-form-panel w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl ring-1 ring-white/10" @click.stop>
          <h3 class="text-lg font-semibold text-white">Edit schedule</h3>
          <form class="mt-4 space-y-4" @submit.prevent="submitEdit">
            <div>
              <label class="block text-sm font-medium text-slate-300">Report</label>
              <select v-model="editReportId" required class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white">
                <option value="">Select report</option>
                <option v-for="r in reports" :key="r.id" :value="r.id">{{ reportDisplayName(r) }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-300">Sender name</label>
              <input v-model="editSenderName" type="text" maxlength="120" class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-300">Email subject</label>
              <input v-model="editEmailSubject" type="text" maxlength="200" class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-300">From email</label>
              <input v-model="editFromEmail" type="email" class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-300">To email</label>
              <input v-model="editToEmail" type="email" class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-300">Frequency</label>
              <select v-model="editFrequency" class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-300">Start date &amp; time</label>
              <input v-model="editStartLocal" type="datetime-local" required class="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white" />
            </div>
            <p v-if="editError" class="text-sm text-rose-400">{{ editError }}</p>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" class="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800" @click="scheduleToEdit = null">
                Cancel
              </button>
              <button type="submit" class="rounded-lg bg-gradient-to-r from-[#22c55e] to-[#3b82f6] px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110" :disabled="editSaving">
                {{ editSaving ? 'Saving…' : 'Save changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="scheduleToDelete"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="scheduleToDelete = null"
      >
        <div class="schedule-form-panel w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl ring-1 ring-white/10" @click.stop>
          <h3 class="text-lg font-semibold text-white">Delete schedule?</h3>
          <p class="mt-2 text-sm text-slate-400">Automated sends will stop for this report until you create a new schedule.</p>
          <div class="mt-4 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
              @click="scheduleToDelete = null"
            >
              Cancel
            </button>
            <button type="button" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500" @click="doDelete">
              Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { AutomatedReportScheduleRecord, Report, SiteRecord } from '~/types'

defineProps<{
  sites: SiteRecord[]
  reports: Array<Report & { expand?: { site?: SiteRecord }; payload_json?: { name?: string } }>
}>()

const { schedules, pending, error, load, setActive, updateSchedule, remove } = useReportSchedules()

const showCreateForm = ref(false)
const reportFilter = ref('')
const mutatingId = ref<string | null>(null)
const scheduleToDelete = ref<AutomatedReportScheduleRecord | null>(null)
const scheduleToEdit = ref<AutomatedReportScheduleRecord | null>(null)
const editReportId = ref('')
const editFrequency = ref<'daily' | 'weekly' | 'monthly'>('weekly')
const editSenderName = ref('')
const editEmailSubject = ref('')
const editFromEmail = ref('')
const editToEmail = ref('')
const editStartLocal = ref('')
const editError = ref('')
const editSaving = ref(false)

const filteredSchedules = computed(() => {
  if (!reportFilter.value) return schedules.value
  return schedules.value.filter((s) => s.report === reportFilter.value)
})

function reportDisplayName(r: Report & { payload_json?: { name?: string } }) {
  const n = r.payload_json?.name?.trim()
  if (n) return n
  return `Report ${r.id.slice(0, 8)}`
}

function formatDateTime(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function toLocalInputValue(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function toIsoFromLocal(dtLocal: string): string {
  const d = new Date(dtLocal)
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
  return d.toISOString()
}

function closeCreateForm() {
  showCreateForm.value = false
}

async function onScheduleCreated() {
  await load()
  closeCreateForm()
}

onMounted(() => {
  void load()
})

async function togglePause(row: AutomatedReportScheduleRecord, active: boolean) {
  mutatingId.value = row.id
  try {
    await setActive(row.id, active)
  } finally {
    mutatingId.value = null
  }
}

function confirmDelete(row: AutomatedReportScheduleRecord) {
  scheduleToDelete.value = row
}

function openEdit(row: AutomatedReportScheduleRecord) {
  scheduleToEdit.value = row
  editReportId.value = (typeof row.report === 'string' ? row.report : '') || (row.expand?.report?.id ?? '')
  editFrequency.value = row.frequency || 'weekly'
  editSenderName.value = row.sender_name || ''
  editEmailSubject.value = row.email_subject || 'Scheduled report: {{site}}'
  editFromEmail.value = row.from_email || ''
  editToEmail.value = row.to_email || ''
  editStartLocal.value = toLocalInputValue(row.start_at || '')
  editError.value = ''
}

async function submitEdit() {
  const row = scheduleToEdit.value
  if (!row) return
  editError.value = ''
  if (!editReportId.value) {
    editError.value = 'Choose a report.'
    return
  }
  let startAtIso = ''
  try {
    startAtIso = toIsoFromLocal(editStartLocal.value)
  } catch {
    editError.value = 'Choose a valid start date/time.'
    return
  }
  editSaving.value = true
  mutatingId.value = row.id
  try {
    await updateSchedule({
      id: row.id,
      reportId: editReportId.value,
      frequency: editFrequency.value,
      startAtIso,
      fromEmail: editFromEmail.value,
      toEmail: editToEmail.value,
      senderName: editSenderName.value,
      emailSubject: editEmailSubject.value,
    })
    scheduleToEdit.value = null
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    editError.value = err.data?.message || err.message || 'Could not update schedule.'
  } finally {
    editSaving.value = false
    mutatingId.value = null
  }
}

async function doDelete() {
  if (!scheduleToDelete.value) return
  const id = scheduleToDelete.value.id
  mutatingId.value = id
  try {
    await remove(id)
    scheduleToDelete.value = null
  } finally {
    mutatingId.value = null
  }
}
</script>
