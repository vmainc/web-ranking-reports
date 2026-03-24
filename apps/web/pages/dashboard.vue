<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <h1 class="text-2xl font-semibold text-surface-900">Dashboard</h1>
    <p class="mt-1 text-sm text-surface-500">Sites, reports and CRM.</p>

    <div class="mt-8">
      <ClientOnly>
        <DashboardAccountCalendar />
        <template #fallback>
          <section class="rounded-xl border border-surface-200 bg-white p-5 shadow-card">
            <div class="mb-4 h-5 w-32 rounded bg-surface-100" />
            <div class="h-24 rounded-lg bg-surface-50" />
          </section>
        </template>
      </ClientOnly>
    </div>

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
    </div>

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
import type { SiteRecord } from '~/types'
import type { Report } from '~/types'

const pb = usePocketbase()
const reports = ref<(Report & { expand?: { site?: SiteRecord } })[]>([])
const reportsPending = ref(false)

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
})
</script>
