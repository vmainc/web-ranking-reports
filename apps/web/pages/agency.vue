<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
    <div class="mb-8">
      <NuxtLink to="/dashboard" class="text-sm font-medium text-surface-600 hover:text-primary-600">← Dashboard</NuxtLink>
      <h1 class="mt-4 text-2xl font-semibold text-surface-900">Agency</h1>
      <p class="mt-1 text-sm text-surface-500">
        Manage branding, report email sending, integrations, the WooCommerce proposal catalog, and planning tools.
      </p>
    </div>

    <nav class="mb-6 inline-flex flex-wrap gap-1 rounded-lg border border-surface-200 bg-white p-1 text-sm shadow-sm">
      <button
        type="button"
        class="rounded-md px-4 py-2 font-medium"
        :class="activeTab === 'agency' ? 'bg-primary-600 text-white' : 'text-surface-700 hover:bg-surface-50'"
        @click="setTab('agency')"
      >
        Agency
      </button>
      <button
        type="button"
        class="rounded-md px-4 py-2 font-medium"
        :class="activeTab === 'email' ? 'bg-primary-600 text-white' : 'text-surface-700 hover:bg-surface-50'"
        @click="setTab('email')"
      >
        Email
      </button>
      <button
        type="button"
        class="rounded-md px-4 py-2 font-medium"
        :class="activeTab === 'integrations' ? 'bg-primary-600 text-white' : 'text-surface-700 hover:bg-surface-50'"
        @click="setTab('integrations')"
      >
        Integrations
      </button>
      <button
        type="button"
        class="rounded-md px-4 py-2 font-medium"
        :class="activeTab === 'planner' ? 'bg-primary-600 text-white' : 'text-surface-700 hover:bg-surface-50'"
        @click="setTab('planner')"
      >
        Agency Planner
      </button>
      <button
        type="button"
        class="rounded-md px-4 py-2 font-medium"
        :class="activeTab === 'domains' ? 'bg-primary-600 text-white' : 'text-surface-700 hover:bg-surface-50'"
        @click="setTab('domains')"
      >
        Domains
      </button>
    </nav>

    <template v-if="activeTab === 'agency'">
      <section class="mb-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-surface-900">Agency details</h2>
        <p class="mt-2 text-sm text-surface-500">
          Used on report headers and exported PDFs.
        </p>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-surface-700">Name</label>
            <input
              v-model="agencyName"
              type="text"
              maxlength="120"
              class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
              placeholder="Acme Marketing"
            />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-surface-700">Address</label>
            <input
              v-model="agencyAddress"
              type="text"
              maxlength="180"
              class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
              placeholder="123 Main St, Raleigh, NC 27601"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Phone</label>
            <input
              v-model="agencyPhone"
              type="text"
              maxlength="40"
              class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
              placeholder="(919) 555-1212"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Local timezone (from address)</label>
            <input
              :value="agencyTimezone"
              type="text"
              readonly
              class="mt-1 w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-700"
            />
            <p class="mt-1 text-xs text-surface-500">Current local time: {{ agencyLocalTimeLabel }}</p>
          </div>
        </div>
      </section>

      <section class="mb-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-surface-900">Agency logo</h2>
        <p class="mt-2 text-sm text-surface-500">
          This logo appears on all reports. Individual sites can still use their own logo in Site Settings.
        </p>
        <div class="mt-4 flex flex-wrap items-start gap-6">
          <div class="flex h-14 w-40 shrink-0 items-center justify-center overflow-hidden rounded border border-surface-200 bg-surface-50">
            <img
              v-if="agencyLogoPreview"
              :src="agencyLogoPreview"
              alt="Agency logo"
              class="h-full w-full object-contain object-left"
            />
            <span v-else class="text-xs text-surface-400">No logo set</span>
          </div>
          <div class="min-w-0 flex-1">
            <input
              ref="agencyLogoInput"
              type="file"
              accept="image/*"
              class="block w-full text-sm text-surface-600 file:mr-3 file:rounded file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
              @change="onAgencyLogoFileChange"
            />
            <p class="mt-2 text-xs text-surface-500">Max 2MB. PNG, JPG or GIF.</p>
            <button
              type="button"
              class="mt-3 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
              :disabled="!canManageAgencyBranding || agencyLogoUploading || !agencyLogoFile"
              @click="uploadAgencyLogo"
            >
              {{ agencyLogoUploading ? 'Uploading…' : 'Upload agency logo' }}
            </button>
            <p v-if="!canManageAgencyBranding && workspaceRole !== null" class="mt-2 text-xs text-surface-500">
              <template v-if="workspaceRole === 'owner' && !whiteLabelFromPlan">
                Custom logos and white-label reports require Starter, Growth, Agency, or an included plan.
                <NuxtLink to="/dashboard/billing" class="font-medium text-primary-600 hover:text-primary-700">View plans</NuxtLink>
              </template>
              <template v-else-if="workspaceRole !== 'owner'">Only the workspace owner can upload the global agency logo.</template>
            </p>
            <p v-if="agencyLogoError" class="mt-2 text-sm text-red-600">{{ agencyLogoError }}</p>
            <p v-if="agencyLogoSuccess" class="mt-2 text-sm text-green-600">Agency logo updated.</p>
          </div>
        </div>
      </section>

      <div class="mb-6">
        <CrmProposalCatalogSettings title="Proposal catalog site" />
      </div>

      <section class="mb-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-surface-900">Report branding colors</h2>
        <p class="mt-2 text-sm text-surface-500">
          When you upload an agency logo, Claude suggests colors automatically. You can override them anytime.
        </p>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-surface-700">Primary</label>
            <div class="mt-1 flex items-center gap-2">
              <input v-model="branding.primary" type="color" class="h-9 w-12 rounded border border-surface-200 bg-white p-1" />
              <input v-model="branding.primary" type="text" class="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Accent</label>
            <div class="mt-1 flex items-center gap-2">
              <input v-model="branding.accent" type="color" class="h-9 w-12 rounded border border-surface-200 bg-white p-1" />
              <input v-model="branding.accent" type="text" class="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Text</label>
            <div class="mt-1 flex items-center gap-2">
              <input v-model="branding.text" type="color" class="h-9 w-12 rounded border border-surface-200 bg-white p-1" />
              <input v-model="branding.text" type="text" class="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-surface-700">Surface</label>
            <div class="mt-1 flex items-center gap-2">
              <input v-model="branding.surface" type="color" class="h-9 w-12 rounded border border-surface-200 bg-white p-1" />
              <input v-model="branding.surface" type="text" class="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="rounded-lg border border-primary-600 bg-white px-4 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-50"
            :disabled="!canManageAgencyBranding || brandingSaving || brandingSuggesting || brandingResetting"
            @click="saveBranding"
          >
            {{ brandingSaving ? 'Saving…' : 'Save report colors' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-surface-300 bg-white px-4 py-2 text-sm font-semibold text-surface-700 hover:bg-surface-50 disabled:opacity-50"
            :disabled="!canManageAgencyBranding || brandingSaving || brandingSuggesting || brandingResetting"
            @click="suggestBrandingFromLogo"
          >
            {{ brandingSuggesting ? 'Analyzing logo…' : 'Pull Colors from Logo' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-surface-300 bg-white px-4 py-2 text-sm font-semibold text-surface-700 hover:bg-surface-50 disabled:opacity-50"
            :disabled="!canManageAgencyBranding || brandingSaving || brandingSuggesting || brandingResetting"
            @click="resetBranding"
          >
            {{ brandingResetting ? 'Resetting…' : 'Reset to defaults' }}
          </button>
          <span v-if="brandingMessage" class="text-sm text-surface-600">{{ brandingMessage }}</span>
        </div>
      </section>
    </template>

    <template v-else-if="activeTab === 'email'">
      <AgencyEmailSendingSettings
        :is-owner="workspaceRole === 'owner'"
        :workspace-role="workspaceRole"
        :auth-headers="authHeaders"
      />
    </template>

    <template v-else-if="activeTab === 'integrations'">
      <section class="mb-6 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-surface-900">Integrations</h2>
        <p class="mt-2 text-sm text-surface-500">
          Workspace connections used across sites. Google Analytics and Ads remain on each site. Meta is connected once for the agency.
        </p>
      </section>
      <AgencyMetaIntegrationSettings
        :is-owner="workspaceRole === 'owner'"
        :workspace-role="workspaceRole"
        :auth-headers="authHeaders"
      />
    </template>

    <template v-else-if="activeTab === 'planner'">
      <div v-if="generating" class="mb-6 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900">
        Building your plan…
      </div>
      <p v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{{ error }}</p>
      <p v-if="saveMessage" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{{ saveMessage }}</p>

      <div class="grid gap-8 lg:grid-cols-2 lg:items-start">
        <agency-form :form="form" :generating="generating" :has-plan="!!plan" @generate="runGenerate" @regenerate="runGenerate" />
        <agency-results
          v-model:selected-site-id="selectedSiteId"
          :plan="plan"
          :sites="sites"
          :saving="saving"
          :adding-todos="addingTodos"
          @save="savePlan"
          @add-todos="onAddTodos"
        />
      </div>
    </template>

    <template v-else-if="activeTab === 'domains'">
      <agency-domains-dashboard />
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })
const pb = usePocketbase()
const route = useRoute()
const router = useRouter()

type AgencyTab = 'agency' | 'email' | 'integrations' | 'planner' | 'domains'

function tabFromQuery(raw: unknown): AgencyTab {
  const t = Array.isArray(raw) ? raw[0] : raw
  if (t === 'email' || t === 'planner' || t === 'domains' || t === 'agency' || t === 'integrations') return t
  return 'agency'
}

const activeTab = ref<AgencyTab>(tabFromQuery(route.query.tab))

function setTab(tab: AgencyTab) {
  activeTab.value = tab
  const query = { ...route.query }
  if (tab === 'agency') delete query.tab
  else query.tab = tab
  void router.replace({ query })
}

watch(
  () => route.query.tab,
  (t) => {
    activeTab.value = tabFromQuery(t)
  },
)

// OAuth return lands with ?emailSending=… — open Email tab
if (route.query.emailSending) {
  activeTab.value = 'email'
}
if (route.query.meta) {
  activeTab.value = 'integrations'
}

const workspaceRole = ref<string | null>(null)
const whiteLabelFromPlan = ref(false)

const canManageAgencyBranding = computed(
  () => workspaceRole.value === 'owner' && whiteLabelFromPlan.value,
)
const agencyLogoPreview = ref<string | null>(null)
const agencyLogoFile = ref<File | null>(null)
const agencyLogoInput = ref<HTMLInputElement | null>(null)
const agencyLogoUploading = ref(false)
const agencyLogoError = ref('')
const agencyLogoSuccess = ref(false)
const agencyName = ref('')
const agencyAddress = ref('')
const agencyPhone = ref('')
const agencyTimezone = ref('America/Chicago')
const branding = reactive({
  primary: '#2563EB',
  accent: '#1D4ED8',
  text: '#0F172A',
  surface: '#FFFFFF',
})
const brandingSaving = ref(false)
const brandingSuggesting = ref(false)
const brandingResetting = ref(false)
const brandingMessage = ref('')
const defaultBranding = {
  primary: '#2563EB',
  accent: '#1D4ED8',
  text: '#0F172A',
  surface: '#FFFFFF',
}

const {
  form,
  plan,
  generating,
  saving,
  addingTodos,
  error,
  saveMessage,
  sites,
  selectedSiteId,
  loadSites,
  generate,
  savePlan,
  addToTodos,
} = useAgencyPlanner()

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

onMounted(() => {
  void loadAgencyAccessFlags()
  void loadAgencyLogoPreview()
  void loadBranding()
  void loadSites()
})

async function loadAgencyAccessFlags() {
  try {
    const ws = await $fetch<{ role?: string }>('/api/account/workspace', { headers: authHeaders() })
    workspaceRole.value = typeof ws?.role === 'string' ? ws.role : null
  } catch {
    workspaceRole.value = null
  }
  try {
    const st = await $fetch<{ limits?: { white_label?: boolean } }>('/api/subscriptions/status', { headers: authHeaders() })
    whiteLabelFromPlan.value = st?.limits?.white_label === true
  } catch {
    whiteLabelFromPlan.value = false
  }
}

onBeforeUnmount(() => {
  if (agencyLogoPreview.value) {
    URL.revokeObjectURL(agencyLogoPreview.value)
    agencyLogoPreview.value = null
  }
})

async function runGenerate() {
  await generate()
}

async function onAddTodos(payload: { siteId: string; includeQuickWins: boolean }) {
  selectedSiteId.value = payload.siteId
  await addToTodos(payload.includeQuickWins)
}

async function loadAgencyLogoPreview() {
  if (agencyLogoPreview.value) {
    URL.revokeObjectURL(agencyLogoPreview.value)
    agencyLogoPreview.value = null
  }
  try {
    const blob = await $fetch<Blob>('/api/agency/logo', { headers: authHeaders(), responseType: 'blob' })
    if (blob?.size) agencyLogoPreview.value = URL.createObjectURL(blob)
  } catch {
    // No logo set
  }
}

function onAgencyLogoFileChange(e: Event) {
  agencyLogoError.value = ''
  agencyLogoSuccess.value = false
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) {
    agencyLogoFile.value = null
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    agencyLogoError.value = 'File must be under 2MB.'
    agencyLogoFile.value = null
    return
  }
  agencyLogoFile.value = file
}

async function uploadAgencyLogo() {
  if (!canManageAgencyBranding.value) {
    agencyLogoError.value =
      workspaceRole.value !== 'owner'
        ? 'Only the workspace owner can upload the agency logo.'
        : 'Custom agency logos require Starter, Growth, Agency, or an included plan.'
    return
  }
  const file = agencyLogoFile.value
  if (!file) return
  agencyLogoError.value = ''
  agencyLogoSuccess.value = false
  agencyLogoUploading.value = true
  try {
    const formData = new FormData()
    formData.append('logo', file)
    await $fetch('/api/admin/agency/logo', {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    })
    agencyLogoSuccess.value = true
    agencyLogoFile.value = null
    if (agencyLogoInput.value) agencyLogoInput.value.value = ''
    await loadAgencyLogoPreview()
    await loadBranding()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    agencyLogoError.value = err?.data?.message ?? err?.message ?? 'Upload failed'
  } finally {
    agencyLogoUploading.value = false
  }
}

async function loadBranding() {
  try {
    const res = await $fetch<{ name?: string; address?: string; phone?: string; timezone?: string; colors?: Partial<typeof branding> }>('/api/agency/branding')
    const colors = res?.colors ?? {}
    agencyName.value = typeof res?.name === 'string' ? res.name : ''
    agencyAddress.value = typeof res?.address === 'string' ? res.address : ''
    agencyPhone.value = typeof res?.phone === 'string' ? res.phone : ''
    agencyTimezone.value = typeof res?.timezone === 'string' && res.timezone ? res.timezone : 'America/Chicago'
    branding.primary = String(colors.primary || branding.primary)
    branding.accent = String(colors.accent || branding.accent)
    branding.text = String(colors.text || branding.text)
    branding.surface = String(colors.surface || branding.surface)
  } catch {
    // keep defaults
  }
}

async function saveBranding() {
  if (!canManageAgencyBranding.value) {
    brandingMessage.value =
      workspaceRole.value !== 'owner'
        ? 'Only the workspace owner can update agency branding.'
        : 'Upgrade to Starter or higher to customize report branding.'
    return
  }
  brandingSaving.value = true
  brandingMessage.value = ''
  try {
    await $fetch('/api/admin/agency/branding', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        name: agencyName.value.trim(),
        address: agencyAddress.value.trim(),
        phone: agencyPhone.value.trim(),
        primary: branding.primary,
        accent: branding.accent,
        text: branding.text,
        surface: branding.surface,
      },
    })
    brandingMessage.value = 'Report colors and local timezone saved.'
    await loadBranding()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    brandingMessage.value = err?.data?.message ?? err?.message ?? 'Failed to save colors.'
  } finally {
    brandingSaving.value = false
  }
}

async function suggestBrandingFromLogo() {
  if (!canManageAgencyBranding.value) {
    brandingMessage.value =
      workspaceRole.value !== 'owner'
        ? 'Only the workspace owner can update agency branding.'
        : 'Upgrade to Starter or higher to customize report branding.'
    return
  }
  brandingSuggesting.value = true
  brandingMessage.value = ''
  try {
    const res = await $fetch<{ colors?: Partial<typeof branding> }>('/api/admin/agency/branding/suggest', {
      method: 'POST',
      headers: authHeaders(),
    })
    const colors = res?.colors ?? {}
    branding.primary = String(colors.primary || branding.primary)
    branding.accent = String(colors.accent || branding.accent)
    branding.text = String(colors.text || branding.text)
    branding.surface = String(colors.surface || branding.surface)
    brandingMessage.value = 'Claude refreshed the color palette from your logo.'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    brandingMessage.value = err?.data?.message ?? err?.message ?? 'Could not analyze the logo.'
  } finally {
    brandingSuggesting.value = false
  }
}

async function resetBranding() {
  if (!canManageAgencyBranding.value) {
    brandingMessage.value =
      workspaceRole.value !== 'owner'
        ? 'Only the workspace owner can update agency branding.'
        : 'Upgrade to Starter or higher to customize report branding.'
    return
  }
  brandingResetting.value = true
  brandingMessage.value = ''
  try {
    await $fetch('/api/admin/agency/branding', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        name: agencyName.value.trim(),
        address: agencyAddress.value.trim(),
        phone: agencyPhone.value.trim(),
        ...defaultBranding,
      },
    })
    branding.primary = defaultBranding.primary
    branding.accent = defaultBranding.accent
    branding.text = defaultBranding.text
    branding.surface = defaultBranding.surface
    brandingMessage.value = 'Reset to default report colors.'
    await loadBranding()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    brandingMessage.value = err?.data?.message ?? err?.message ?? 'Failed to reset colors.'
  } finally {
    brandingResetting.value = false
  }
}

const agencyLocalTimeLabel = computed(() => {
  try {
    return new Date().toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: agencyTimezone.value,
    })
  } catch {
    return new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  }
})
</script>
