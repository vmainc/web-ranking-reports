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
        <h2 class="text-lg font-semibold text-surface-900">CRM</h2>
        <p class="mt-1 text-sm text-surface-500">Track clients, leads, sales and contact activity.</p>
        <NuxtLink
          to="/crm"
          class="mt-4 inline-flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-5 py-4 text-left shadow-card transition hover:shadow-card-hover"
        >
          <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
          <div>
            <span class="font-medium text-surface-900">Open CRM</span>
            <span class="mt-0.5 block text-sm text-surface-500">Clients, leads, sales, contact points</span>
          </div>
          <span class="ml-auto text-primary-600">→</span>
        </NuxtLink>
      </section>
    </template>

    <DashboardAddSiteModal v-model="showAddModal" @saved="goToNewSite" />
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import { listSites } from '~/services/sites'

const pb = usePocketbase()
const sites = ref<SiteRecord[]>([])
const pending = ref(true)
const showAddModal = ref(false)

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

function goToNewSite(siteId: string) {
  showAddModal.value = false
  navigateTo(`/sites/${siteId}/dashboard`)
}

onMounted(() => loadSites())
</script>
