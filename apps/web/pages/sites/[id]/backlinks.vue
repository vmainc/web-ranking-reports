<template>
  <SiteIntegrationShell max-width="7xl">
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
        <h1 class="text-2xl font-semibold text-surface-900">Backlinks</h1>
        <p class="mt-1 text-sm text-surface-500">
          Check links pointing back to your site. Data from
          <a href="https://dataforseo.com/apis/backlinks-api" target="_blank" rel="noopener noreferrer" class="text-primary-600 underline">DataForSEO Backlinks</a>
          (same credentials as rank tracking in Admin → Integrations).
        </p>
      </div>

      <section class="mb-8 rounded-xl border border-surface-200 bg-white p-5 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <p class="max-w-2xl text-sm text-surface-600">
            Each refresh runs five live API requests and uses your DataForSEO balance. Load when you need an up-to-date profile.
          </p>
          <button
            type="button"
            class="shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="backlinksLoading || !site.domain"
            @click="loadBacklinks"
          >
            {{ backlinksLoading ? 'Loading…' : backlinksData ? 'Refresh data' : 'Load backlink data' }}
          </button>
        </div>

        <div class="mt-6">
          <BacklinksProfilePanel
            :data="backlinksData"
            :loading="backlinksLoading && !backlinksData"
            :error="backlinksError"
            show-cost
            empty-hint="Click “Load backlink data” to fetch your profile from DataForSEO."
          />
        </div>
      </section>
    </template>

    <div v-else class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-primary-600 hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </SiteIntegrationShell>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import type { BacklinksProfile } from '~/types/backlinks'
import { getSite } from '~/services/sites'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()

const site = ref<SiteRecord | null>(null)
const pending = ref(true)

const { loadLatest, refreshLive } = useBacklinksProfile()

const backlinksData = ref<BacklinksProfile | null>(null)
const backlinksLoading = ref(false)
const backlinksError = ref('')

async function loadCachedProfile() {
  if (!site.value?.id) return
  backlinksLoading.value = true
  backlinksError.value = ''
  try {
    backlinksData.value = await loadLatest(site.value.id)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    backlinksError.value = err?.data?.message ?? err?.message ?? 'Failed to load cached backlinks'
  } finally {
    backlinksLoading.value = false
  }
}

async function loadBacklinks() {
  if (!site.value?.id || backlinksLoading.value) return
  backlinksLoading.value = true
  backlinksError.value = ''
  try {
    backlinksData.value = await refreshLive(site.value.id)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    backlinksError.value = err?.data?.message ?? err?.message ?? 'Failed to load backlinks'
  } finally {
    backlinksLoading.value = false
  }
}

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
    await loadCachedProfile()
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>
