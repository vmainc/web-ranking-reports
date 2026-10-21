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
        <h1 class="text-2xl font-semibold text-surface-900">AI visibility</h1>
        <p class="mt-1 max-w-3xl text-sm text-surface-500">
          See how often your domain and tracked keywords appear in Google AI Overviews and ChatGPT.
          Data from
          <a
            href="https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/overview/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary-600 underline"
          >DataForSEO LLM Mentions</a>
          (same API login as rank tracking).
        </p>
      </div>

      <section class="app-light-surface mb-8 rounded-xl border border-surface-200 bg-white p-5 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="max-w-2xl space-y-2">
            <p class="text-sm text-surface-600">
              Each refresh runs one live request for your domain plus up to five rank-tracked keywords (~$0.10 per request).
              Saved snapshots stay on this site until you refresh.
            </p>
            <p
              v-if="profile?.fetchedAt"
              class="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-2 text-sm text-violet-950"
            >
              <span class="font-medium">Last fetched</span>
              <time :datetime="profile.fetchedAt">{{ formatAiVisibilityWhen(profile.fetchedAt) }}</time>
            </p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="loading || !site.domain"
            @click="refresh"
          >
            {{ loading ? 'Loading…' : profile ? 'Refresh data' : 'Load AI visibility' }}
          </button>
        </div>

        <div class="mt-6">
          <AiVisibilityPanel
            :data="profile"
            :loading="loading && !profile"
            :error="loadError"
            show-cost
            empty-hint="Click “Load AI visibility” to fetch LLM mention metrics from DataForSEO."
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
import type { AiVisibilityProfile } from '~/types/aiVisibility'
import { parseAiVisibilitySnapshot } from '~/types/aiVisibility'
import { formatAiVisibilityWhen } from '~/utils/aiVisibilityDisplay'
import { getSite } from '~/services/sites'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()

const site = ref<SiteRecord | null>(null)
const pending = ref(true)

const { loadLatest, refreshLive } = useAiVisibilityProfile()

const profile = ref<AiVisibilityProfile | null>(null)
const loading = ref(false)
const loadError = ref('')

function hydrateFromSiteRecord(record: SiteRecord | null) {
  const snap = parseAiVisibilitySnapshot(record?.ai_visibility_snapshot)
  if (snap) profile.value = snap
}

async function loadCached() {
  if (!site.value?.id) return
  loading.value = true
  loadError.value = ''
  try {
    hydrateFromSiteRecord(site.value)
    const cached = await loadLatest(site.value.id)
    if (cached) profile.value = cached
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    loadError.value = err?.data?.message ?? err?.message ?? 'Could not load cached snapshot.'
  } finally {
    loading.value = false
  }
}

async function refresh() {
  if (!site.value?.id) return
  loading.value = true
  loadError.value = ''
  try {
    profile.value = await refreshLive(site.value.id)
    const refreshed = await getSite(pb, site.value.id)
    if (refreshed) {
      site.value = refreshed
      hydrateFromSiteRecord(refreshed)
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    loadError.value = err?.data?.message ?? err?.message ?? 'Refresh failed.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
    await loadCached()
  } finally {
    pending.value = false
  }
})
</script>
