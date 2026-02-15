<template>
  <div class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
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
        <h1 class="text-2xl font-semibold text-surface-900">Site settings</h1>
        <p class="mt-1 text-sm text-surface-500">{{ site.domain }}</p>
      </div>

      <!-- What's connected -->
      <section class="mb-10 rounded-xl border border-surface-200 bg-white p-6 shadow-card">
        <h2 class="mb-4 text-lg font-medium text-surface-900">What's connected</h2>
        <p class="mb-4 text-sm text-surface-500">
          Integrations linked to this site. Manage them from the site dashboard.
        </p>
        <ul class="space-y-3">
          <li
            v-for="int in integrations"
            :key="int.id"
            class="flex items-center justify-between rounded-lg border border-surface-100 bg-surface-50/50 px-4 py-3"
          >
            <span class="font-medium text-surface-800">{{ getProviderLabel(int.provider) }}</span>
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="statusClass(int.status)"
            >
              {{ getStatusLabel(int.status) }}
            </span>
          </li>
        </ul>
        <NuxtLink
          :to="`/sites/${site.id}`"
          class="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline"
        >
          Manage integrations →
        </NuxtLink>
      </section>

      <!-- Logo -->
      <section class="mb-10 rounded-xl border border-surface-200 bg-white p-6 shadow-card">
        <h2 class="mb-4 text-lg font-medium text-surface-900">Site logo</h2>
        <p class="mb-4 text-sm text-surface-500">
          Optional logo for this site (e.g. for reports or branding). Max 2MB.
        </p>
        <div class="flex flex-wrap items-start gap-6">
          <div
            v-if="logoUrl"
            class="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-surface-200 bg-surface-50"
          >
            <img :src="logoUrl" alt="Site logo" class="h-full w-full object-contain" />
          </div>
          <div v-else class="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-surface-200 bg-surface-50 text-surface-400">
            <span class="text-xs">No logo</span>
          </div>
          <div class="min-w-0 flex-1">
            <input
              ref="logoInput"
              type="file"
              accept="image/*"
              class="block w-full text-sm text-surface-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
              @change="onLogoChange"
            />
            <p v-if="logoError" class="mt-2 text-sm text-red-600">{{ logoError }}</p>
            <p v-if="logoSuccess" class="mt-2 text-sm text-green-600">Logo updated.</p>
          </div>
        </div>
      </section>

      <!-- Delete site -->
      <section class="rounded-xl border border-red-100 bg-red-50/50 p-6">
        <h2 class="mb-2 text-lg font-medium text-surface-900">Delete site</h2>
        <p class="mb-4 text-sm text-surface-600">
          Remove this site from your dashboard. Integrations and reports for this site will be removed. This cannot be undone.
        </p>
        <div v-if="!confirmDelete" class="flex items-center gap-3">
          <button
            type="button"
            class="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            @click="confirmDelete = true"
          >
            Delete site
          </button>
        </div>
        <div v-else class="flex flex-wrap items-center gap-3">
          <span class="text-sm text-surface-700">Are you sure?</span>
          <button
            type="button"
            class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            :disabled="deleting"
            @click="deleteSiteConfirm"
          >
            {{ deleting ? 'Deleting…' : 'Yes, delete' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
            :disabled="deleting"
            @click="confirmDelete = false"
          >
            Cancel
          </button>
        </div>
        <p v-if="deleteError" class="mt-3 text-sm text-red-600">{{ deleteError }}</p>
      </section>
    </template>

    <div v-else class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-primary-600 hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord, IntegrationRecord } from '~/types'
import { getSite, deleteSite as deleteSiteService, updateSiteLogo } from '~/services/sites'
import { listIntegrationsBySite, getProviderLabel, getStatusLabel } from '~/services/integrations'
import type { IntegrationStatus } from '~/types'

const route = useRoute()
const router = useRouter()
const siteId = computed(() => route.params.id as string)

const pb = usePocketbase()
const site = ref<SiteRecord | null>(null)
const integrations = ref<IntegrationRecord[]>([])
const pending = ref(true)
const logoInput = ref<HTMLInputElement | null>(null)
const logoError = ref('')
const logoSuccess = ref(false)
const confirmDelete = ref(false)
const deleting = ref(false)
const deleteError = ref('')

const logoUrl = computed(() => {
  const s = site.value
  if (!s?.logo) return null
  try {
    return pb.files.getUrl(s, s.logo)
  } catch {
    return null
  }
})

function statusClass(status: IntegrationStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-green-100 text-green-800'
    case 'pending':
      return 'bg-amber-100 text-amber-800'
    case 'error':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-surface-100 text-surface-600'
  }
}

async function loadSite() {
  site.value = await getSite(pb, siteId.value)
}

async function loadIntegrations() {
  if (!site.value) return
  integrations.value = await listIntegrationsBySite(pb, site.value.id)
}

async function onLogoChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  logoError.value = ''
  logoSuccess.value = false
  if (!file || !site.value) return
  if (file.size > 2 * 1024 * 1024) {
    logoError.value = 'File must be under 2MB.'
    return
  }
  try {
    await updateSiteLogo(pb, site.value.id, file)
    site.value = await getSite(pb, site.value!.id)
    logoSuccess.value = true
    if (logoInput.value) logoInput.value.value = ''
    setTimeout(() => { logoSuccess.value = false }, 3000)
  } catch (err: unknown) {
    logoError.value = err instanceof Error ? err.message : 'Upload failed. If your PocketBase sites collection has no "logo" file field, add it in Admin.'
  }
}

async function deleteSiteConfirm() {
  if (!site.value || deleting.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteSiteService(pb, site.value.id)
    await router.push('/dashboard')
  } catch (err: unknown) {
    deleteError.value = err instanceof Error ? err.message : 'Failed to delete site.'
  } finally {
    deleting.value = false
  }
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
