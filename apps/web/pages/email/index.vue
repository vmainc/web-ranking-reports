<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-surface-900">Email marketing</h1>
        <p class="mt-1 text-sm text-surface-500">
          Campaigns use your CRM: contacts, leads, and sites. This section is separate from the CRM screens so you can focus on sends.
        </p>
      </div>
      <NuxtLink
        to="/email/create"
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
      >
        Create campaign
      </NuxtLink>
    </div>

    <EmailMarketingNav />

    <email-campaign-list :campaigns="campaigns" :pending="pending" />
  </div>
</template>

<script setup lang="ts">
import type { EmailCampaignListItem } from '~/types'

definePageMeta({ layout: 'default' })

const pb = usePocketbase()
const campaigns = ref<EmailCampaignListItem[]>([])
const pending = ref(true)

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function load() {
  pending.value = true
  try {
    const data = await $fetch<{ campaigns: EmailCampaignListItem[] }>('/api/email-campaigns', { headers: authHeaders() })
    campaigns.value = data.campaigns ?? []
  } catch {
    campaigns.value = []
  } finally {
    pending.value = false
  }
}

onMounted(() => load())
</script>
