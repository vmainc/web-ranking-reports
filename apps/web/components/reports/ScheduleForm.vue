<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div>
      <label class="block text-sm font-medium text-surface-700">Site</label>
      <select
        v-model="localSiteId"
        required
        class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
        :disabled="!!siteIdLocked"
      >
        <option value="">Select site</option>
        <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }} ({{ s.domain }})</option>
      </select>
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
      <p class="mt-1 text-xs text-surface-500">Your first report will run on the selected start date.</p>
    </div>
    <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
    <div>
      <button
        type="submit"
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
        :disabled="saving || !localSiteId"
      >
        {{ saving ? 'Saving…' : 'Save schedule' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'

const props = defineProps<{
  sites: SiteRecord[]
  /** When set, site dropdown is fixed (e.g. filtered tab context). */
  siteIdLocked?: string
}>()

const { createSchedule } = useReportSchedules()

const localSiteId = ref(props.siteIdLocked ?? '')
const frequency = ref<'daily' | 'weekly' | 'monthly'>('weekly')
const startLocal = ref(defaultStartLocal())
const saving = ref(false)
const formError = ref('')

watch(
  () => props.siteIdLocked,
  (id) => {
    if (id) localSiteId.value = id
  },
  { immediate: true },
)

function defaultStartLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function toIsoFromLocal(dtLocal: string): string {
  const d = new Date(dtLocal)
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
  return d.toISOString()
}

async function submit() {
  formError.value = ''
  if (!localSiteId.value) return
  let startAtIso: string
  try {
    startAtIso = toIsoFromLocal(startLocal.value)
  } catch {
    formError.value = 'Please choose a valid start date and time.'
    return
  }
  saving.value = true
  try {
    await createSchedule(localSiteId.value, frequency.value, startAtIso)
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
