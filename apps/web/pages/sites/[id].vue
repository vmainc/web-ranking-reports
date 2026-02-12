<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-surface-500">Loading…</p>
    </div>

    <template v-else-if="site">
      <div class="mb-8">
        <NuxtLink
          to="/dashboard"
          class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
        >
          ← Dashboard
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-surface-900">{{ site.name }}</h1>
        <p class="mt-1 text-sm text-surface-500">{{ site.domain }}</p>
      </div>

      <section>
        <h2 class="mb-4 text-lg font-medium text-surface-900">Integrations</h2>
        <p class="mb-6 text-sm text-surface-500">
          Connect data sources for this site. Each integration can be enabled when ready.
        </p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SiteIntegrationCard
            v-for="provider in providerList"
            :key="provider"
            :site-id="site.id"
            :provider="provider"
            :integration="integrationByProvider(provider)"
            @updated="refreshIntegrations"
          />
        </div>
      </section>
    </template>

    <div v-else class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-primary-600 hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord, IntegrationRecord, IntegrationProvider } from '~/types'
import { getSite } from '~/services/sites'
import { listIntegrationsBySite, getProviderList } from '~/services/integrations'

const route = useRoute()
const siteId = computed(() => route.params.id as string)

const pb = usePocketbase()
const site = ref<SiteRecord | null>(null)
const integrations = ref<IntegrationRecord[]>([])
const pending = ref(true)

const providerList = getProviderList()

function integrationByProvider(provider: IntegrationProvider): IntegrationRecord | undefined {
  return integrations.value.find((i) => i.provider === provider)
}

async function loadSite() {
  const s = await getSite(pb, siteId.value)
  site.value = s
}

async function loadIntegrations() {
  if (!site.value) return
  integrations.value = await listIntegrationsBySite(pb, site.value.id)
}

async function refreshIntegrations() {
  await loadIntegrations()
}

async function init() {
  pending.value = true
  try {
    await loadSite()
    await loadIntegrations()
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>
