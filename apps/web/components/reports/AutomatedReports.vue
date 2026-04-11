<template>
  <div class="space-y-8">
    <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
      <h3 class="text-base font-semibold text-surface-900">New schedule</h3>
      <p class="mt-1 text-sm text-surface-500">Automated reports capture a ranking snapshot on each run (PDF and email later).</p>
      <div class="mt-4 max-w-md">
        <ReportsScheduleForm :sites="sites" :site-id-locked="siteFilter || undefined" />
      </div>
    </section>

    <section class="rounded-xl border border-surface-200 bg-white shadow-sm">
      <div class="border-b border-surface-200 px-6 py-4">
        <h3 class="text-lg font-semibold text-surface-900">Your schedules</h3>
        <p v-if="sites.length > 1" class="mt-2 text-sm text-surface-500">
          <label class="mr-2 font-medium text-surface-700">Filter by site</label>
          <select v-model="siteFilter" class="mt-1 rounded-lg border border-surface-300 px-3 py-2 text-sm sm:mt-0">
            <option value="">All sites</option>
            <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </p>
      </div>

      <div v-if="pending" class="px-6 py-12 text-center text-sm text-surface-500">Loading…</div>
      <div v-else-if="!filteredSchedules.length" class="px-6 py-12 text-center text-surface-500">No automated reports yet</div>
      <div v-else class="overflow-hidden">
        <table class="min-w-full divide-y divide-surface-200">
          <thead class="bg-surface-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500">Site</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500">Frequency</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500">Next run</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500">Last run</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500">Status</th>
              <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-surface-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-200 bg-white">
            <tr v-for="row in filteredSchedules" :key="row.id" class="hover:bg-surface-50/50">
              <td class="px-6 py-4 text-sm text-surface-900">{{ row.expand?.site?.name ?? '—' }}</td>
              <td class="px-6 py-4 text-sm capitalize text-surface-600">{{ row.frequency }}</td>
              <td class="px-6 py-4 text-sm text-surface-600">{{ formatDateTime(row.next_run_at) }}</td>
              <td class="px-6 py-4 text-sm text-surface-600">{{ row.last_run_at ? formatDateTime(row.last_run_at) : '—' }}</td>
              <td class="px-6 py-4 text-sm">
                <span :class="row.is_active !== false ? 'text-emerald-700' : 'text-surface-500'">
                  {{ row.is_active !== false ? 'Active' : 'Paused' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right text-sm">
                <span class="inline-flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                  <button
                    v-if="row.is_active !== false"
                    type="button"
                    class="text-surface-600 hover:underline"
                    :disabled="mutatingId === row.id"
                    @click="togglePause(row, false)"
                  >
                    Pause
                  </button>
                  <button
                    v-else
                    type="button"
                    class="text-primary-600 hover:underline"
                    :disabled="mutatingId === row.id"
                    @click="togglePause(row, true)"
                  >
                    Resume
                  </button>
                  <span class="text-surface-300">|</span>
                  <button
                    type="button"
                    class="text-red-600 hover:underline"
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
      <p v-if="error" class="border-t border-surface-100 px-6 py-3 text-sm text-red-600">{{ error }}</p>
    </section>

    <Teleport to="body">
      <div
        v-if="scheduleToDelete"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="scheduleToDelete = null"
      >
        <div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" @click.stop>
          <h3 class="text-lg font-semibold text-surface-900">Delete schedule?</h3>
          <p class="mt-2 text-sm text-surface-600">Automated snapshots will stop for this site until you create a new schedule.</p>
          <div class="mt-4 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
              @click="scheduleToDelete = null"
            >
              Cancel
            </button>
            <button type="button" class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500" @click="doDelete">
              Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { AutomatedReportScheduleRecord, SiteRecord } from '~/types'

const props = defineProps<{
  sites: SiteRecord[]
}>()

const { schedules, pending, error, load, setActive, remove } = useReportSchedules()

const siteFilter = ref('')
const mutatingId = ref<string | null>(null)
const scheduleToDelete = ref<AutomatedReportScheduleRecord | null>(null)

const filteredSchedules = computed(() => {
  if (!siteFilter.value) return schedules.value
  return schedules.value.filter((s) => s.site === siteFilter.value)
})

function formatDateTime(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
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
