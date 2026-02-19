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
        <h1 class="text-2xl font-semibold text-surface-900">Site audit</h1>
        <p class="mt-1 text-sm text-surface-500">
          Technical and SEO health checks for {{ site.domain }}.
        </p>
      </div>

      <section class="rounded-xl border border-surface-200 bg-white p-8 shadow-sm text-center">
        <p class="text-surface-600">Coming soon.</p>
      </section>
    </template>

    <div v-else class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-primary-600 hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import { getSite } from '~/services/sites'

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()
const site = ref<SiteRecord | null>(null)
const pending = ref(true)

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>
