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

    <ul v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li
        v-for="site in sites"
        :key="site.id"
        class="rounded-xl border border-surface-200 bg-white p-5 shadow-card transition hover:shadow-card-hover"
      >
        <NuxtLink :to="`/sites/${site.id}`" class="block">
          <h3 class="font-semibold text-surface-900">{{ site.name }}</h3>
          <p class="mt-1 text-sm text-surface-500">{{ site.domain }}</p>
          <span class="mt-3 inline-block text-sm font-medium text-primary-600">View site →</span>
        </NuxtLink>
      </li>
    </ul>

    <DashboardAddSiteModal v-model="showAddModal" @saved="refreshSites" />
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

function refreshSites() {
  loadSites()
}

onMounted(() => loadSites())
</script>
