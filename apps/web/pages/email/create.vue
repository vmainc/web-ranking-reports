<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6 sm:py-8">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-surface-900">Create campaign</h1>
        <p class="mt-1 text-sm text-surface-500">
          Pick a starter template, copy a past campaign, or compose from scratch. Review with a test send before
          scheduling.
        </p>
      </div>
      <NuxtLink to="/email" class="text-sm font-medium text-surface-600 hover:text-primary-600">← Campaigns</NuxtLink>
    </div>

    <EmailMarketingNav />

    <div v-if="sitesPending || draftPending" class="py-12 text-center text-sm text-surface-500">Loading…</div>
    <email-campaign-form
      v-else
      :sites="sites"
      :initial-template-id="initialTemplateId"
      :initial-draft="initialDraft"
      @created="onCreated"
    />
  </div>
</template>

<script setup lang="ts">
import type { Site } from '~/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const pb = usePocketbase()
const sites = ref<Site[]>([])
const sitesPending = ref(true)
const draftPending = ref(false)
const initialTemplateId = computed(() => {
  const t = route.query.template
  return typeof t === 'string' ? t : undefined
})
const initialDraft = ref<{
  name?: string
  subject?: string
  bodyHtml?: string
  loadedFromCampaignName?: string
} | undefined>(undefined)

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadDraftFromCampaign(fromId: string) {
  draftPending.value = true
  try {
    const res = await $fetch<{
      campaign: { name: string; subject: string; body_html: string }
    }>(`/api/email-campaigns/${encodeURIComponent(fromId)}`, { headers: authHeaders() })
    const c = res.campaign
    initialDraft.value = {
      name: `${c.name.trim()} (copy)`,
      subject: c.subject,
      bodyHtml: c.body_html,
      loadedFromCampaignName: c.name.trim(),
    }
  } catch {
    initialDraft.value = undefined
  } finally {
    draftPending.value = false
  }
}

onMounted(async () => {
  const from = route.query.from
  const fromId = typeof from === 'string' ? from.trim() : ''
  if (fromId) {
    await loadDraftFromCampaign(fromId)
  }

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