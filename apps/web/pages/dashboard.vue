<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <h1 class="text-2xl font-semibold text-surface-900">Dashboard</h1>
    <p class="mt-1 text-sm text-surface-500">Sites, reports and CRM.</p>

    <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        to="/sites"
        class="inline-flex items-center gap-4 rounded-xl border border-surface-200 bg-white px-5 py-5 text-left shadow-card transition hover:shadow-card-hover"
      >
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </span>
        <div class="min-w-0 flex-1">
          <span class="font-semibold text-surface-900">My Sites</span>
          <span class="mt-0.5 block text-sm text-surface-500">Manage sites and integrations</span>
        </div>
        <span class="shrink-0 text-primary-600">→</span>
      </NuxtLink>

      <NuxtLink
        to="/reports"
        class="inline-flex items-center gap-4 rounded-xl border border-surface-200 bg-white px-5 py-5 text-left shadow-card transition hover:shadow-card-hover"
      >
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5a2 2 0 012 2v5a2 2 0 01-2 2zm-3-3h0" />
          </svg>
        </span>
        <div class="min-w-0 flex-1">
          <span class="font-semibold text-surface-900">Reports</span>
          <span class="mt-0.5 block text-sm text-surface-500">Full report, analytics, Lighthouse</span>
        </div>
        <span class="shrink-0 text-primary-600">→</span>
      </NuxtLink>

      <NuxtLink
        to="/crm"
        class="inline-flex items-center gap-4 rounded-xl border border-surface-200 bg-white px-5 py-5 text-left shadow-card transition hover:shadow-card-hover"
      >
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </span>
        <div class="min-w-0 flex-1">
          <span class="font-semibold text-surface-900">CRM</span>
          <span class="mt-0.5 block text-sm text-surface-500">Contacts, leads</span>
        </div>
        <span class="shrink-0 text-primary-600">→</span>
      </NuxtLink>

      <NuxtLink
        to="/to-do"
        class="block rounded-xl border border-surface-200 bg-white px-5 py-5 text-left shadow-card transition hover:shadow-card-hover"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-4">
            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5h4v14H5" />
              </svg>
            </span>
            <div class="min-w-0">
              <p class="font-semibold text-surface-900">To Do</p>
              <p class="mt-0.5 block text-sm text-surface-500">
                {{ tasksPending ? 'Loading…' : tasks.length ? `${tasks.length} open` : '' }}
              </p>
            </div>
          </div>
          <span class="shrink-0 text-sm font-medium text-primary-600">→</span>
        </div>
      </NuxtLink>

      <div
        class="inline-flex cursor-default items-center gap-4 rounded-xl border border-surface-200 bg-white px-5 py-5 text-left shadow-card"
        aria-label="Email marketing — coming soon"
      >
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-500">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </span>
        <div class="min-w-0 flex-1">
          <span class="font-semibold text-surface-900">Email marketing</span>
          <span class="mt-0.5 block text-sm text-surface-500">Coming soon</span>
        </div>
        <span class="shrink-0 text-xs font-medium uppercase tracking-wide text-surface-400">Soon</span>
      </div>

      <div
        class="inline-flex cursor-default items-center gap-4 rounded-xl border border-surface-200 bg-white px-5 py-5 text-left shadow-card"
        aria-label="Agency goals — coming soon"
      >
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-500">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </span>
        <div class="min-w-0 flex-1">
          <span class="font-semibold text-surface-900">Agency goals</span>
          <span class="mt-0.5 block text-sm text-surface-500">Coming soon</span>
        </div>
        <span class="shrink-0 text-xs font-medium uppercase tracking-wide text-surface-400">Soon</span>
      </div>
    </div>

    <section class="mt-10">
      <DashboardTodoCalendar
        :tasks="tasks"
        :scheduled-reports="scheduledReports"
        :google-events="googleEvents"
        :pending="tasksPending || schedulesPending || googleEventsPending"
      />
    </section>

    <section v-if="!reportsPending && reports.length" class="mt-12">
      <h2 class="text-lg font-semibold text-surface-900">Recent reports</h2>
      <ul class="mt-4 space-y-2">
        <li
          v-for="r in reports"
          :key="r.id"
          class="flex items-center justify-between rounded-lg border border-surface-200 bg-white px-4 py-3 text-sm"
        >
          <span class="text-surface-700">{{ reportLabel(r) }}</span>
          <NuxtLink :to="reportLink(r)" class="font-medium text-primary-600 hover:underline">View</NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord, Report, TodoTask } from '~/types'

const pb = usePocketbase()
const reports = ref<(Report & { expand?: { site?: SiteRecord } })[]>([])
const reportsPending = ref(false)
const tasks = ref<TodoTask[]>([])
const tasksPending = ref(true)
const scheduledReports = ref<Array<{ id: string; reportId: string; siteId: string; siteName: string; weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6; title: string }>>([])
const schedulesPending = ref(true)
const googleEvents = ref<Array<{ id: string; summary: string; start: string; end: string; calendarId: string; calendarLabel: string; htmlLink?: string }>>([])
const googleEventsPending = ref(true)

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadReports() {
  reportsPending.value = true
  try {
    const data = await $fetch<{ reports: (Report & { expand?: { site?: SiteRecord } })[] }>('/api/reports/list', {
      headers: authHeaders(),
      query: { limit: 10, type: 'full' },
    })
    reports.value = data.reports ?? []
  } catch {
    reports.value = []
  } finally {
    reportsPending.value = false
  }
}

async function loadTasks() {
  tasksPending.value = true
  try {
    const authId = pb.authStore.model?.id as string | undefined
    if (!authId) {
      tasks.value = []
      return
    }
    const list = await pb.collection('todo_tasks').getFullList<TodoTask>({
      filter: `user = "${authId}" && status = "open"`,
      sort: 'due_at',
      expand: 'site',
    })
    tasks.value = list
  } catch {
    tasks.value = []
  } finally {
    tasksPending.value = false
  }
}

async function loadReportSchedules() {
  schedulesPending.value = true
  try {
    const list = await pb.collection('reports').getFullList<Report & { expand?: { site?: SiteRecord } }>({
      filter: 'type = "full"',
      sort: '-updated',
      expand: 'site',
    })
    scheduledReports.value = list
      .map((r) => {
        const payload = r.payload_json as { schedule?: { enabled?: boolean; cadence?: string; weekday?: number; title?: string } } | undefined
        const schedule = payload?.schedule
        if (!schedule?.enabled || schedule.cadence !== 'weekly') return null
        const weekday = Number(schedule.weekday)
        if (!(weekday >= 0 && weekday <= 6)) return null
        const siteId = typeof r.site === 'string' ? r.site : (r.site as { id?: string })?.id
        if (!siteId) return null
        const siteName = r.expand?.site?.name ?? 'Site'
        const title = (payload as { name?: string } | undefined)?.name?.trim() || `Weekly report · ${siteName}`
        return {
          id: r.id,
          reportId: r.id,
          siteId,
          siteName,
          weekday: weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6,
          title,
        }
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
  } catch {
    scheduledReports.value = []
  } finally {
    schedulesPending.value = false
  }
}

async function loadGoogleEvents() {
  googleEventsPending.value = true
  try {
    const res = await $fetch<{
      events: Array<{ id: string; summary: string; start: string; end: string; calendarId: string; calendarLabel: string; htmlLink?: string }>
    }>('/api/account/google/events', {
      headers: authHeaders(),
      query: { maxResults: 25 },
    })
    googleEvents.value = res.events ?? []
  } catch {
    googleEvents.value = []
  } finally {
    googleEventsPending.value = false
  }
}

function reportLabel(r: Report & { expand?: { site?: SiteRecord }; payload_json?: { name?: string } }): string {
  const name = r.payload_json?.name?.trim()
  if (name) return name
  const siteName = r.expand?.site?.name ?? r.site
  const period = r.period_start ? new Date(r.period_start).toLocaleDateString(undefined, { dateStyle: 'short' }) : ''
  return period ? `${siteName} · ${period}` : String(siteName)
}

function reportLink(r: Report & { expand?: { site?: SiteRecord } }): string {
  const siteId = typeof r.site === 'string' ? r.site : (r.site as { id?: string })?.id
  if (!siteId) return '/dashboard'
  return `/sites/${siteId}/full-report?reportId=${r.id}`
}

onMounted(() => {
  loadReports()
  loadTasks()
  loadReportSchedules()
  loadGoogleEvents()
})
</script>
