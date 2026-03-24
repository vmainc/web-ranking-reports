<template>
  <section class="rounded-xl border border-surface-200 bg-white p-5 shadow-card">
    <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-surface-900">Calendar</h2>
        <p class="mt-0.5 text-sm text-surface-500">
          Uses your default Google account from
          <NuxtLink to="/account" class="font-medium text-primary-600 hover:underline">Account</NuxtLink>.
        </p>
      </div>
      <NuxtLink
        v-if="status?.connected"
        to="/account"
        class="shrink-0 text-sm font-medium text-primary-600 hover:underline"
      >
        Manage
      </NuxtLink>
    </div>

    <div v-if="loading" class="py-6 text-sm text-surface-500">Loading…</div>

    <div v-else-if="!status?.connected" class="rounded-lg border border-surface-100 bg-surface-50/80 px-4 py-5 text-sm text-surface-600">
      <p>Connect a default Google account under Account to see upcoming events here.</p>
      <NuxtLink to="/account" class="mt-3 inline-block font-medium text-primary-600 hover:underline">Open Account →</NuxtLink>
    </div>

    <div v-else-if="!status.hasCalendarScope" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Calendar access isn’t on your current Google connection. Reconnect Google under Account and approve Calendar.
    </div>

    <div v-else-if="!status.calendar" class="rounded-lg border border-surface-100 bg-surface-50/80 px-4 py-4 text-sm text-surface-600">
      <p>Choose which calendar to show on the dashboard.</p>
      <NuxtLink to="/account" class="mt-2 inline-block font-medium text-primary-600 hover:underline">Select calendar in Account →</NuxtLink>
    </div>

    <div v-else>
      <p class="mb-3 text-xs font-medium uppercase tracking-wide text-surface-500">{{ status.calendar.summary }}</p>
      <div v-if="eventsLoading" class="py-4 text-sm text-surface-500">Loading events…</div>
      <ul v-else-if="events.length" class="divide-y divide-surface-100">
        <li v-for="e in events" :key="e.id" class="flex flex-wrap items-baseline justify-between gap-2 py-2.5 first:pt-0">
          <span class="font-medium text-surface-900">{{ e.summary }}</span>
          <span class="text-sm text-surface-500">{{ formatWhen(e.start, e.end) }}</span>
        </li>
      </ul>
      <p v-else class="text-sm text-surface-500">No upcoming events in the next two weeks.</p>
      <p v-if="eventsError" class="mt-2 text-sm text-red-600">{{ eventsError }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useAccountGoogle } from '~/composables/useAccountGoogle'
import type { AccountGoogleStatus } from '~/composables/useAccountGoogle'

const { getStatus, getEvents } = useAccountGoogle()

const loading = ref(true)
const status = ref<AccountGoogleStatus | null>(null)
const events = ref<Array<{ id: string; summary: string; start: string; end: string }>>([])
const eventsLoading = ref(false)
const eventsError = ref('')

function formatWhen(start: string, end: string): string {
  if (!start) return ''
  const s = start.includes('T') ? new Date(start) : new Date(start + 'T12:00:00')
  if (Number.isNaN(s.getTime())) return start
  if (start.length <= 10) return s.toLocaleDateString(undefined, { dateStyle: 'medium' })
  return s.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

async function load() {
  loading.value = true
  try {
    status.value = await getStatus()
    if (status.value?.connected && status.value.hasCalendarScope && status.value.calendar) {
      eventsLoading.value = true
      eventsError.value = ''
      try {
        const res = await getEvents({ maxResults: 10 })
        events.value = res.events ?? []
      } catch (e) {
        eventsError.value = e instanceof Error ? e.message : 'Could not load events'
        events.value = []
      } finally {
        eventsLoading.value = false
      }
    } else {
      events.value = []
    }
  } catch {
    status.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => load())
</script>
