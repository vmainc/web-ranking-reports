<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div>
      <label class="block text-sm font-medium text-surface-700">Report</label>
      <select
        v-model="reportId"
        required
        class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
      >
        <option value="">Select report</option>
        <option v-for="r in reports" :key="r.id" :value="r.id">
          {{ reportDisplayName(r) }} · {{ r.expand?.site?.name ?? 'No site' }}
        </option>
      </select>
    </div>
    <div>
      <label class="block text-sm font-medium text-surface-700">Sender name</label>
      <input
        v-model="senderName"
        type="text"
        maxlength="120"
        class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
        placeholder="Your agency name"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-surface-700">Email subject</label>
      <input
        v-model="emailSubject"
        type="text"
        maxlength="200"
        class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
        placeholder="Scheduled report: {{site}}"
      />
      <p v-pre class="mt-1 text-xs text-surface-500">Supports tokens: {{site}}, {{date}}</p>
    </div>
    <div>
      <label class="block text-sm font-medium text-surface-700">From email</label>
      <input
        v-model="fromEmail"
        type="email"
        class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
        placeholder="reports@youragency.com"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-surface-700">To email</label>
      <input
        v-model="toEmail"
        type="email"
        class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
        placeholder="client@example.com"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-surface-700">Frequency</label>
      <select v-model="frequency" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>
    </div>
    <div>
      <label class="block text-sm font-medium text-surface-700">Start date &amp; time</label>
      <input
        v-model="startLocal"
        type="datetime-local"
        required
        class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
      />
      <p class="mt-1 text-xs text-surface-500">First send: {{ pretty(firstRunIso) }} · Next send: {{ pretty(nextRunIso) }}</p>
    </div>
    <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
    <div>
      <button
        type="submit"
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
        :disabled="saving || !reportId"
      >
        {{ saving ? 'Saving…' : 'Save schedule' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { Report, SiteRecord } from '~/types'

const props = defineProps<{
  reports: Array<Report & { expand?: { site?: SiteRecord }; payload_json?: { name?: string } }>
}>()

const { createSchedule } = useReportSchedules()
const pb = usePocketbase()

const reportId = ref('')
const frequency = ref<'daily' | 'weekly' | 'monthly'>('weekly')
const senderName = ref('')
const emailSubject = ref('Scheduled report: {{site}}')
const fromEmail = ref('')
const toEmail = ref('')
const startLocal = ref(defaultStartLocal())
const saving = ref(false)
const formError = ref('')

function defaultStartLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

onMounted(() => {
  const model = pb.authStore.model as { name?: string; email?: string } | null
  const name = typeof model?.name === 'string' ? model.name.trim() : ''
  const email = typeof model?.email === 'string' ? model.email.trim() : ''
  if (!senderName.value && name) senderName.value = name
  if (!fromEmail.value && email) fromEmail.value = email
})

function toIsoFromLocal(dtLocal: string): string {
  const d = new Date(dtLocal)
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
  return d.toISOString()
}

function reportDisplayName(r: Report & { expand?: { site?: SiteRecord }; payload_json?: { name?: string } }) {
  const n = r.payload_json?.name?.trim()
  if (n) return n
  return `Report ${r.id.slice(0, 8)}`
}

const firstRunIso = computed(() => {
  try {
    return toIsoFromLocal(startLocal.value)
  } catch {
    return ''
  }
})

function addOneMonthLocal(d: Date): Date {
  const y = d.getFullYear()
  const m = d.getMonth()
  const day = d.getDate()
  const hh = d.getHours()
  const mm = d.getMinutes()
  const ss = d.getSeconds()
  const ms = d.getMilliseconds()
  const targetMonth = m + 1
  const targetYear = y + Math.floor(targetMonth / 12)
  const normalizedMonth = ((targetMonth % 12) + 12) % 12
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate()
  const useDay = Math.min(day, lastDay)
  return new Date(targetYear, normalizedMonth, useDay, hh, mm, ss, ms)
}

function computeNextRun(from: Date, f: 'daily' | 'weekly' | 'monthly'): Date {
  const d = new Date(from.getTime())
  if (f === 'daily') {
    d.setDate(d.getDate() + 1)
    return d
  }
  if (f === 'weekly') {
    d.setDate(d.getDate() + 7)
    return d
  }
  return addOneMonthLocal(d)
}

const nextRunIso = computed(() => {
  if (!firstRunIso.value) return ''
  const start = new Date(firstRunIso.value)
  return computeNextRun(start, frequency.value).toISOString()
})

function pretty(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

async function submit() {
  formError.value = ''
  if (!reportId.value) return
  let startAtIso: string
  try {
    startAtIso = toIsoFromLocal(startLocal.value)
  } catch {
    formError.value = 'Please choose a valid start date and time.'
    return
  }
  saving.value = true
  try {
    await createSchedule({
      reportId: reportId.value,
      frequency: frequency.value,
      startAtIso,
      fromEmail: fromEmail.value,
      toEmail: toEmail.value,
      senderName: senderName.value,
      emailSubject: emailSubject.value,
    })
    reportId.value = ''
    fromEmail.value = ''
    toEmail.value = ''
    senderName.value = ''
    emailSubject.value = 'Scheduled report: {{site}}'
    startLocal.value = defaultStartLocal()
  } catch (e: unknown) {
    const err = e as {
      data?: { message?: string; statusMessage?: string }
      statusMessage?: string
      message?: string
      statusCode?: number
      status?: number
    }
    const fromServer = err.data?.message || err.data?.statusMessage || err.statusMessage || err.message
    const code = err.statusCode ?? err.status
    if (fromServer) {
      formError.value = fromServer
    } else if (code === 404) {
      formError.value = 'Schedule API not found. Restart Nuxt (`npm run dev`) after updating the app.'
    } else {
      formError.value = 'Could not save schedule. Try again.'
    }
  } finally {
    saving.value = false
  }
}
</script>
