<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div v-if="site" class="mb-8">
      <NuxtLink
        :to="`/sites/${site.id}`"
        class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
      >
        ← {{ site.name }}
      </NuxtLink>
      <h1 class="text-2xl font-semibold text-surface-900">{{ providerLabel }}</h1>
      <p class="mt-1 text-sm text-surface-500">Integration details and reports.</p>
    </div>
    <div class="rounded-xl border border-surface-200 bg-surface-50 p-8 text-center">
      <p class="text-surface-600">Reports for this integration are coming soon.</p>
      <NuxtLink v-if="site" :to="`/sites/${site.id}`" class="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline">
        Back to {{ site.name }}
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import type { IntegrationProvider } from '~/types'
import { getSite } from '~/services/sites'
import { getProviderLabel } from '~/services/integrations'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const provider = computed(() => route.params.provider as IntegrationProvider)
const providerLabel = computed(() => getProviderLabel(provider.value))

const pb = usePocketbase()
const site = ref<SiteRecord | null>(null)

onMounted(async () => {
  try {
    site.value = await getSite(pb, siteId.value)
  } catch {
    site.value = null
  }
})
watch(siteId, async () => {
  try {
    site.value = await getSite(pb, siteId.value)
  } catch {
    site.value = null
  }
})
</script>
