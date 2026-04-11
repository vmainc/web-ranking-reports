<template>
  <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-surface-900">Create campaign</h1>
        <p class="mt-1 text-sm text-surface-500">Compose your message and choose who receives it.</p>
      </div>
      <NuxtLink to="/crm/email" class="text-sm font-medium text-surface-600 hover:text-primary-600">← Campaigns</NuxtLink>
    </div>

    <nav class="mb-6 flex flex-wrap gap-1 border-b border-surface-200">
      <NuxtLink to="/crm" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Dashboard</NuxtLink>
      <NuxtLink to="/crm/clients" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Contacts</NuxtLink>
      <NuxtLink to="/crm/pipeline" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Leads</NuxtLink>
      <NuxtLink to="/crm/onboarding" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Onboarding</NuxtLink>
      <NuxtLink to="/crm/email" class="border-b-2 border-primary-600 px-4 py-3 text-sm font-medium text-primary-600">Email campaigns</NuxtLink>
    </nav>

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
  router.push('/crm/email')
}
</script>
