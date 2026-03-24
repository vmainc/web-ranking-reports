<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-surface-500">Loading…</p>
    </div>

    <template v-else-if="site">
      <div class="mb-8">
        <NuxtLink
          :to="`/sites/${site.id}`"
          class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
        >
          ← {{ site.name }}
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-surface-900">Google Calendar</h1>
        <p class="mt-1 text-sm text-surface-500">
          Per-site calendar. The main dashboard uses the calendar you choose under Account → Default Google account.
        </p>
      </div>

      <div
        v-if="googleStatus && !googleStatus.connected"
        class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800"
      >
        <p class="font-medium">Google is not connected for this site.</p>
        <p class="mt-1 text-sm">Connect Google from Site settings → What’s connected, then return here to pick a calendar.</p>
        <NuxtLink :to="`/sites/${site.id}/settings`" class="mt-4 inline-block text-sm font-medium underline">
          Open site settings
        </NuxtLink>
      </div>

      <template v-else-if="googleStatus?.connected">
        <div v-if="!googleStatus.providers?.google_calendar?.hasScope" class="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p class="font-medium">Calendar access not granted yet.</p>
          <p class="mt-1">
            Disconnect Google in Site settings, connect again, and approve access to Google Calendar. Ensure the Google Calendar API is enabled for your OAuth client in Google Cloud Console.
          </p>
        </div>

        <section v-else-if="!googleStatus.selectedCalendar" class="mb-10">
          <h2 class="mb-2 text-lg font-medium text-surface-900">Choose a calendar</h2>
          <p class="mb-4 text-sm text-surface-500">We only read events (read-only). Pick which calendar to use for this site.</p>
          <div class="flex flex-wrap items-center gap-3">
            <select
              v-model="calendarSelectId"
              class="min-w-[260px] rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              :disabled="calendarsLoading"
            >
              <option value="">
                {{ calendarsLoading ? 'Loading calendars…' : calendars.length ? '— Select calendar —' : 'Load calendars' }}
              </option>
              <option v-for="c in calendars" :key="c.id" :value="c.id">
                {{ c.summary }}{{ c.primary ? ' (primary)' : '' }}
              </option>
            </select>
            <button
              v-if="!calendars.length && !calendarsLoading"
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
              @click="loadCalendars"
            >
              Load calendars
            </button>
            <button
              v-else-if="calendarSelectId"
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
              :disabled="calendarSaving"
              @click="saveCalendar"
            >
              {{ calendarSaving ? 'Saving…' : 'Use this calendar' }}
            </button>
          </div>
          <p v-if="calendarsError" class="mt-4 text-sm text-red-600">{{ calendarsError }}</p>
        </section>

        <template v-else>
          <div class="mb-6">
            <h2 class="text-lg font-medium text-surface-900">Upcoming events</h2>
            <p class="mt-0.5 text-sm text-surface-500">
              Calendar: {{ googleStatus.selectedCalendar.summary }}
            </p>
            <p class="mt-1 text-sm text-surface-500">
              <button type="button" class="text-primary-600 hover:underline" :disabled="changingCalendar" @click="handleChangeCalendar">
                Change calendar
              </button>
            </p>
          </div>

          <div v-if="eventsLoading" class="py-8 text-sm text-surface-500">Loading events…</div>
          <ul v-else-if="events.length" class="space-y-3">
            <li
              v-for="e in events"
              :key="e.id"
              class="rounded-lg border border-surface-200 bg-white px-4 py-3 shadow-sm"
            >
              <p class="font-medium text-surface-900">{{ e.summary }}</p>
              <p class="mt-1 text-sm text-surface-600">{{ formatEventWhen(e.start, e.end) }}</p>
              <a
                v-if="e.htmlLink"
                :href="e.htmlLink"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-2 inline-block text-sm font-medium text-primary-600 hover:underline"
              >
                Open in Google Calendar
              </a>
            </li>
          </ul>
          <p v-else class="text-sm text-surface-500">No upcoming events in the next two weeks.</p>
          <p v-if="eventsError" class="mt-4 text-sm text-red-600">{{ eventsError }}</p>
        </template>
      </template>
    </template>

    <div v-else class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-primary-600 hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import type { GoogleStatusResponse } from '~/composables/useGoogleIntegration'
import { getSite } from '~/services/sites'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'
import { getApiErrorMessage } from '~/utils/apiError'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()
const site = ref<SiteRecord | null>(null)
const pending = ref(true)
const {
  getStatus,
  getCalendarList,
  selectCalendar,
  clearCalendar,
  getCalendarEvents,
} = useGoogleIntegration()
const googleStatus = ref<GoogleStatusResponse | null>(null)

const calendars = ref<Array<{ id: string; summary: string; primary?: boolean }>>([])
const calendarsLoading = ref(false)
const calendarsError = ref('')
const calendarSelectId = ref('')
const calendarSaving = ref(false)
const changingCalendar = ref(false)

const events = ref<Array<{ id: string; summary: string; htmlLink?: string; start: string; end: string }>>([])
const eventsLoading = ref(false)
const eventsError = ref('')

async function loadCalendars() {
  if (!site.value) return
  calendarsLoading.value = true
  calendarsError.value = ''
  try {
    const res = await getCalendarList(site.value.id)
    calendars.value = res.calendars ?? []
    if (calendars.value.length && !calendarSelectId.value) {
      const primary = calendars.value.find((c) => c.primary)
      calendarSelectId.value = primary?.id ?? calendars.value[0].id
    }
  } catch (e) {
    calendarsError.value = getApiErrorMessage(e)
  } finally {
    calendarsLoading.value = false
  }
}

async function saveCalendar() {
  if (!site.value || !calendarSelectId.value) return
  const c = calendars.value.find((x) => x.id === calendarSelectId.value)
  calendarSaving.value = true
  calendarsError.value = ''
  try {
    await selectCalendar(site.value.id, calendarSelectId.value, c?.summary)
    googleStatus.value = await getStatus(site.value.id).catch(() => null)
    await loadEvents()
  } catch (e) {
    calendarsError.value = getApiErrorMessage(e)
  } finally {
    calendarSaving.value = false
  }
}

async function handleChangeCalendar() {
  if (!site.value) return
  changingCalendar.value = true
  eventsError.value = ''
  try {
    await clearCalendar(site.value.id)
    googleStatus.value = await getStatus(site.value.id).catch(() => null)
    calendars.value = []
    calendarSelectId.value = ''
    events.value = []
    await loadCalendars()
  } finally {
    changingCalendar.value = false
  }
}

function formatEventWhen(start: string, end: string): string {
  const s = start.includes('T') ? new Date(start) : new Date(start + 'T12:00:00')
  const e = end.includes('T') ? new Date(end) : new Date(end + 'T12:00:00')
  if (Number.isNaN(s.getTime())) return `${start} – ${end}`
  const opt: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }
  if (start.length <= 10 && end.length <= 10) {
    return `${s.toLocaleDateString(undefined, { dateStyle: 'medium' })} (all day)`
  }
  return `${s.toLocaleString(undefined, opt)} – ${e.toLocaleString(undefined, opt)}`
}

async function loadEvents() {
  if (!site.value || !googleStatus.value?.selectedCalendar) return
  eventsLoading.value = true
  eventsError.value = ''
  try {
    const res = await getCalendarEvents(site.value.id, { maxResults: 25 })
    events.value = res.events ?? []
  } catch (e) {
    eventsError.value = getApiErrorMessage(e)
    events.value = []
  } finally {
    eventsLoading.value = false
  }
}

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
    if (!site.value) return
    googleStatus.value = await getStatus(site.value.id).catch(() => null)
    const g = googleStatus.value
    if (g?.connected && g.providers?.google_calendar?.hasScope && !g.selectedCalendar) {
      await loadCalendars()
    } else if (g?.selectedCalendar) {
      await loadEvents()
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>
