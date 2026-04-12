<template>
  <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-surface-900">Create campaign</h1>
        <p class="mt-1 text-sm text-surface-500">
          Compose your message and audience. The AI assistant (Claude) can suggest ideas, subjects, and HTML — configure the key under Admin → Integrations.
        </p>
      </div>
      <NuxtLink to="/email" class="text-sm font-medium text-surface-600 hover:text-primary-600">← Campaigns</NuxtLink>
    </div>

    <EmailMarketingNav />

    <div v-if="sitesPending" class="py-12 text-center text-sm text-surface-500">Loading…</div>
    <email-campaign-form v-else :sites="sites" @created="onCreated" />
  </div>
</template>

<script setup lang="ts">
import type { Site } from '~/types'

definePageMeta({ layout: 'default' })

const router = useRouter()
const pb = usePocketbase()
const sites = ref<Site[]>([])
const sitesPending = ref(true)

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

onMounted(async () => {
  try {
    const data = await $fetch<{ sites: Site[] }>('/api/workspace/sites', { headers: authHeaders() })
    sites.value = data.sites ?? []
  } catch {
    sites.value = []
  } finally {
    sitesPending.value = false
  }
})

function onCreated() {
  router.push('/email')
}
</script>
