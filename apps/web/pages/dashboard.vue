<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-surface-900">Sites</h1>
        <p class="mt-1 text-sm text-surface-500">Manage your sites and their integrations.</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
        @click="showAddModal = true"
      >
        Add Site
      </button>
    </div>

    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-surface-500">Loading sites…</p>
    </div>

    <div v-else-if="!sites.length" class="rounded-2xl border border-dashed border-surface-200 bg-white p-12 text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-100 text-surface-400">
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      </div>
      <h2 class="mt-4 text-lg font-medium text-surface-900">No sites yet</h2>
      <p class="mt-2 text-sm text-surface-500">Add your first site to start connecting integrations and viewing reports.</p>
      <button
        type="button"
        class="mt-6 inline-flex items-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
        @click="showAddModal = true"
      >
        Add Site
      </button>
    </div>

    <template v-else>
      <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li
          v-for="site in sites"
          :key="site.id"
          class="relative rounded-xl border border-surface-200 bg-white p-5 shadow-card transition hover:shadow-card-hover"
        >
          <NuxtLink :to="`/sites/${site.id}`" class="block">
            <h3 class="font-semibold text-surface-900">{{ site.name }}</h3>
            <p class="mt-1 text-sm text-surface-500">{{ site.domain }}</p>
            <span class="mt-3 inline-block text-sm font-medium text-primary-600">View site →</span>
          </NuxtLink>
          <NuxtLink
            :to="`/sites/${site.id}/settings`"
            class="absolute right-3 top-3 rounded p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-600"
            title="Site settings"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </NuxtLink>
        </li>
      </ul>

      <section class="mt-12">
        <h2 class="text-lg font-semibold text-surface-900">Other tools</h2>
        <p class="mt-1 text-sm text-surface-500">Reports and CRM.</p>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <NuxtLink
            to="/reports"
            class="inline-flex items-center gap-3 rounded-xl border border-surface-200 bg-white px-5 py-4 text-left shadow-card transition hover:shadow-card-hover"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5a2 2 0 012 2v5a2 2 0 01-2 2zm-3-3h0" />
              </svg>
            </span>
            <div class="min-w-0 flex-1">
              <span class="font-medium text-surface-900">Make a report</span>
              <span class="mt-0.5 block text-sm text-surface-500">Full report, analytics, Lighthouse</span>
            </div>
            <span class="shrink-0 text-primary-600">→</span>
          </NuxtLink>
          <NuxtLink
            to="/crm"
            class="inline-flex items-center gap-3 rounded-xl border border-surface-200 bg-white px-5 py-4 text-left shadow-card transition hover:shadow-card-hover"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <div class="min-w-0 flex-1">
              <span class="font-medium text-surface-900">CRM</span>
              <span class="mt-0.5 block text-sm text-surface-500">Clients, leads, sales, contact points</span>
            </div>
            <span class="shrink-0 text-primary-600">→</span>
          </NuxtLink>
        </div>
        <div v-if="!reportsPending && reports.length" class="mt-3">
          <p class="mb-2 text-xs font-medium uppercase tracking-wide text-surface-500">Recent reports</p>
          <ul class="space-y-2">
            <li
              v-for="r in reports"
              :key="r.id"
              class="flex items-center justify-between rounded-lg border border-surface-200 bg-white px-4 py-3 text-sm"
            >
              <span class="text-surface-700">{{ reportLabel(r) }}</span>
              <NuxtLink :to="reportLink(r)" class="font-medium text-primary-600 hover:underline">View</NuxtLink>
            </li>
          </ul>
        </div>
      </section>
    </template>

    <DashboardAddSiteModal v-model="showAddModal" @saved="goToNewSite" />
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import type { Report } from '~/types'
import { listSites } from '~/services/sites'

const pb = usePocketbase()
const sites = ref<SiteRecord[]>([])
const pending = ref(true)
const showAddModal = ref(false)
const reports = ref<(Report & { expand?: { site?: SiteRecord } })[]>([])
const reportsPending = ref(false)

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadSites() {
  pending.value = true
  try {
    sites.value = await listSites(pb)
  } catch {
    sites.value = []
  } finally {
    pending.value = false
  }
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

function goToNewSite(siteId: string) {
  showAddModal.value = false
  navigateTo(`/sites/${siteId}/dashboard`)
}

onMounted(() => {
  loadSites()
  loadReports()
})
</script>
