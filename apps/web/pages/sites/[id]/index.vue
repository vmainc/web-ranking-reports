<template>
  <SiteIntegrationShell max-width="7xl">
    <div v-if="pending" class="flex justify-center py-12">
      <p class="text-surface-500">Loading…</p>
    </div>

    <template v-else-if="site">
      <div class="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <NuxtLink
            to="/dashboard"
            class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
          >
            ← Dashboard
          </NuxtLink>
          <h1 class="text-2xl font-semibold text-surface-900">{{ site.name }}</h1>
          <p class="mt-1 text-sm text-surface-500">{{ site.domain }}</p>
        </div>
        <NuxtLink
          v-if="site.canWrite !== false"
          :to="`/sites/${site.id}/settings`"
          class="rounded-lg border border-surface-200 px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
        >
          Site settings
        </NuxtLink>
      </div>

      <div class="space-y-6">
        <section class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-lg font-medium text-surface-900">Site data</h2>
            <NuxtLink
              :to="`/sites/${site.id}/full-report?preset=weekly_snapshot`"
              class="text-sm font-medium text-primary-600 hover:underline"
            >
              Weekly snapshot report →
            </NuxtLink>
          </div>
          <p class="mb-3 text-sm text-surface-500">
            Metrics for Analytics, Ads, Lighthouse, rank tracking, and WooCommerce live in the weekly snapshot. Open a connection below for the full tool.
          </p>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NuxtLink
              v-for="card in siteIntegrationCards"
              :key="card.key"
              :to="card.href"
              class="flex items-start gap-3 rounded-lg border border-surface-200 bg-white p-4 transition hover:border-primary-200 hover:shadow-sm"
            >
              <span
                class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-white p-0.5 ring-1 ring-surface-200"
              >
                <img
                  v-if="card.brandIconUrl"
                  :src="card.brandIconUrl"
                  class="h-6 w-6 object-contain"
                  width="24"
                  height="24"
                  alt=""
                  loading="lazy"
                />
                <svg v-else-if="card.key === 'bing'" class="h-6 w-6" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#008373" d="M5 3v16.5l4 2.5 8-4.5V8L9 5.5 5 3zm4 2.2l5.5 3.1v6.4L9 17.3V5.2z" />
                </svg>
                <svg v-else-if="card.key === 'rank'" class="h-6 w-6" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10" cy="10" r="5" stroke="#047857" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" />
                  <path d="M14 14l5 5" stroke="#047857" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" />
                  <path d="M8.5 10.3l1.2 1.2 2.3-2.3" stroke="#065F46" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" />
                </svg>
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-surface-900">{{ card.title }}</p>
                <p class="mt-0.5 text-xs text-surface-500">{{ card.subtitle }}</p>
              </div>
            </NuxtLink>

            <div
              v-if="site.canWrite !== false"
              ref="addIntegrationWrap"
              class="relative min-h-[4.75rem]"
            >
              <button
                type="button"
                class="flex h-full min-h-[4.75rem] w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-primary-300 bg-primary-50/20 p-4 text-center transition hover:border-primary-500 hover:bg-primary-50/40"
                :aria-expanded="addIntegrationMenuOpen"
                aria-haspopup="listbox"
                aria-controls="add-integration-menu"
                @click.stop="addIntegrationMenuOpen = !addIntegrationMenuOpen"
              >
                <span class="text-3xl font-light leading-none text-primary-600" aria-hidden="true">+</span>
                <span class="text-xs font-semibold text-primary-800">Add integration</span>
              </button>
              <div
                v-if="addIntegrationMenuOpen"
                id="add-integration-menu"
                role="listbox"
                class="absolute left-0 right-0 z-50 mt-1 max-h-[min(70vh,22rem)] overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 py-1 shadow-2xl ring-1 ring-white/10 sm:left-auto sm:min-w-[min(100vw-2rem,22rem)]"
                @click.stop
              >
                <p class="border-b border-slate-700 px-3 py-2 text-xs font-medium text-slate-400">
                  Choose an integration to set up
                </p>
                <ul class="py-1">
                  <li v-for="opt in addIntegrationOptions" :key="opt.key">
                    <NuxtLink
                      :to="opt.to"
                      class="block px-3 py-2.5 text-left transition hover:bg-slate-800"
                      role="option"
                      @click="addIntegrationMenuOpen = false"
                    >
                      <span class="text-sm font-semibold text-white">{{ opt.title }}</span>
                      <span class="mt-0.5 block text-xs text-slate-400">{{ opt.description }}</span>
                    </NuxtLink>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <p v-if="!siteIntegrationCards.length && site.canWrite === false" class="mt-3 text-sm text-surface-500">
            No integrations are connected for this site yet.
          </p>
        </section>

        <section v-if="showSiteToolsSection" class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <h2 class="mb-3 text-lg font-medium text-surface-900">Tools</h2>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NuxtLink
              :to="`/sites/${site.id}/to-do`"
              class="flex items-start gap-3 rounded-lg border border-surface-200 bg-white p-4 transition hover:border-primary-200 hover:shadow-sm"
            >
              <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white p-0.5 ring-1 ring-surface-200 text-primary-600">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5h4v14H5" />
                </svg>
              </span>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-surface-900">To Do</p>
                <p class="mt-0.5 text-xs text-surface-500">
                  {{
                    siteTasksPending
                      ? 'Loading…'
                      : siteOpenTaskCount > 0
                        ? `${siteOpenTaskCount} open`
                        : 'No open tasks'
                  }}
                </p>
              </div>
            </NuxtLink>

            <NuxtLink
              :to="`/sites/${site.id}/site-audit`"
              class="flex items-start gap-3 rounded-lg border border-surface-200 bg-white p-4 transition hover:border-primary-200 hover:shadow-sm"
            >
              <span class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded bg-white p-0.5 ring-1 ring-surface-200 text-amber-700">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-surface-900">Run site audit</p>
                <p class="text-xs text-surface-500">Technical and SEO health checks</p>
              </div>
            </NuxtLink>

            <NuxtLink
              :to="`/sites/${site.id}/research`"
              class="flex items-start gap-3 rounded-lg border border-surface-200 bg-white p-4 transition hover:border-primary-200 hover:shadow-sm"
            >
              <span class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded bg-white p-0.5 ring-1 ring-surface-200 text-violet-700">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16l2.5-2.5L13 16l5-5M4 20h16M5 4h14v8H5V4z" />
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-surface-900">Research</p>
                <p class="text-xs text-surface-500">Competitors and keyword ideas</p>
              </div>
            </NuxtLink>

            <NuxtLink
              :to="`/sites/${site.id}/content-generator`"
              class="flex items-start gap-3 rounded-lg border border-surface-200 bg-white p-4 transition hover:border-primary-200 hover:shadow-sm"
            >
              <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white p-0.5 ring-1 ring-surface-200 text-rose-700">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-surface-900">Content generator</p>
                <p class="text-xs text-surface-500">Keywords → ideas → SEO article draft</p>
              </div>
            </NuxtLink>
          </div>

        </section>
      </div>
    </template>

    <div v-else class="rounded-2xl border border-surface-200 bg-white p-12 text-center">
      <p class="text-surface-500">Site not found.</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-primary-600 hover:underline">Back to Dashboard</NuxtLink>
    </div>
  </SiteIntegrationShell>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import type { GoogleStatusResponse } from '~/composables/useGoogleIntegration'
import { getSite } from '~/services/sites'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'
import { BRAND_ICON_BY_DASH_KEY, brandIconCdnUrl } from '~/utils/integrationBrandIcons'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()
const { getStatus } = useGoogleIntegration()
const { plan, loading: planLoading, refreshPlan } = useSubscriptionPlan()

/** To Do, site audit, research, and content generator: Growth, Agency, or comped. */
const showSiteToolsSection = computed(
  () => !planLoading.value && plan.value !== null && plan.value !== 'free' && plan.value !== 'starter',
)

const site = ref<SiteRecord | null>(null)
const googleStatus = ref<GoogleStatusResponse | null>(null)
const pending = ref(true)

const siteOpenTaskCount = ref(0)
const siteTasksPending = ref(false)

const addIntegrationMenuOpen = ref(false)
const addIntegrationWrap = ref<HTMLElement | null>(null)

type AddIntegrationOption = { key: string; title: string; description: string; to: string }

const woocommerceEnabled = (useRuntimeConfig().public as { woocommerceEnabled?: boolean }).woocommerceEnabled !== false
const wooIntegrationConfigured = ref(false)
const bingIntegrationConfigured = ref(false)

type SiteIntCard = {
  key: string
  title: string
  subtitle: string
  href: string
  /** Simple Icons CDN URL, or null (e.g. Bing — use inline SVG). */
  brandIconUrl: string | null
}

const siteIntegrationCards = computed((): SiteIntCard[] => {
  const s = site.value
  const g = googleStatus.value
  if (!s) return []
  const base = `/sites/${s.id}`
  const out: SiteIntCard[] = []

  if (g?.connected && g.providers?.google_analytics?.status === 'connected' && g.selectedProperty) {
    out.push({
      key: 'ga',
      title: 'Google Analytics',
      subtitle: 'Website traffic, users, and engagement trends',
      href: `${base}/dashboard`,
      brandIconUrl: brandIconCdnUrl(BRAND_ICON_BY_DASH_KEY.ga),
    })
  }
  if (g?.connected && g.selectedSearchConsoleSite) {
    out.push({
      key: 'gsc',
      title: 'Google Search Console',
      subtitle: 'Organic search clicks, impressions, and queries',
      href: `${base}/search-console`,
      brandIconUrl: brandIconCdnUrl(BRAND_ICON_BY_DASH_KEY.gsc),
    })
  }
  if (g?.providers?.lighthouse?.status === 'connected') {
    out.push({
      key: 'lh',
      title: 'Lighthouse',
      subtitle: 'Performance, accessibility, SEO audits',
      href: `${base}/lighthouse`,
      brandIconUrl: brandIconCdnUrl(BRAND_ICON_BY_DASH_KEY.lh),
    })
  }
  if (g?.connected && g.selectedAdsCustomer) {
    out.push({
      key: 'ads',
      title: 'Google Ads',
      subtitle: 'Paid campaign cost, clicks, and conversions',
      href: `${base}/ads`,
      brandIconUrl: brandIconCdnUrl(BRAND_ICON_BY_DASH_KEY.ads),
    })
  }
  if (
    g?.connected &&
    g.providers?.google_local_services_ads?.status === 'connected' &&
    g.providers?.google_local_services_ads?.hasScope
  ) {
    out.push({
      key: 'lsa',
      title: 'Google Local Service Ads',
      subtitle: 'Leads, spend, and performance for Local Services campaigns',
      href: `${base}/local-service-ads`,
      brandIconUrl: brandIconCdnUrl(BRAND_ICON_BY_DASH_KEY.lsa),
    })
  }
  if (g?.connected && g.selectedBusinessProfileLocation) {
    out.push({
      key: 'gbp',
      title: 'Google Business Profile',
      subtitle: 'Local listing presence, calls, and direction actions',
      href: `${base}/business-profile`,
      brandIconUrl: brandIconCdnUrl(BRAND_ICON_BY_DASH_KEY.gbp),
    })
  }
  if (woocommerceEnabled && wooIntegrationConfigured.value) {
    out.push({
      key: 'woo',
      title: 'WooCommerce',
      subtitle: 'Store revenue, orders, and product performance',
      href: `${base}/woocommerce`,
      brandIconUrl: brandIconCdnUrl(BRAND_ICON_BY_DASH_KEY.woo),
    })
  }
  if (bingIntegrationConfigured.value) {
    out.push({
      key: 'bing',
      title: 'Bing Webmaster',
      subtitle: 'Bing indexing and search visibility data',
      href: `${base}/bing-webmaster`,
      brandIconUrl: null,
    })
  }
  out.push({
    key: 'rank',
    title: 'Rank tracking',
    subtitle: 'Keyword positions and ranking movement over time',
    href: `${base}/rank-tracking`,
    brandIconUrl: null,
  })
  return out
})

const addIntegrationOptions = computed((): AddIntegrationOption[] => {
  const s = site.value
  const g = googleStatus.value
  if (!s) return []

  const base = `/sites/${s.id}`
  const setup0 = `${base}/setup?step=0`
  const out: AddIntegrationOption[] = []

  const gaDone =
    !!g?.connected &&
    g.providers?.google_analytics?.status === 'connected' &&
    !!g.selectedProperty
  const gscDone = !!g?.connected && !!g.selectedSearchConsoleSite
  const lhDone = g?.providers?.lighthouse?.status === 'connected'
  const adsDone = !!g?.connected && !!g.selectedAdsCustomer
  const lsaDone = g?.providers?.google_local_services_ads?.status === 'connected'
  const gbpDone = !!g?.connected && !!g.selectedBusinessProfileLocation
  const wooDone = !woocommerceEnabled || wooIntegrationConfigured.value
  const bingDone = bingIntegrationConfigured.value

  if (!g?.connected) {
    out.push({
      key: 'google',
      title: 'Connect Google',
      description: 'Sign in once for Analytics, Search Console, Ads, Business Profile, and Lighthouse.',
      to: setup0,
    })
    out.push({
      key: 'ga_pre',
      title: 'Google Analytics',
      description: 'Available after you connect Google — then pick a GA4 property.',
      to: setup0,
    })
    out.push({
      key: 'gsc_pre',
      title: 'Google Search Console',
      description: 'Available after you connect Google — then link your property.',
      to: setup0,
    })
    out.push({
      key: 'lh_pre',
      title: 'Lighthouse',
      description: 'Core Web Vitals and audits — connect Google to enable.',
      to: setup0,
    })
    out.push({
      key: 'gbp_pre',
      title: 'Google Business Profile',
      description: 'Available after you connect Google — then choose a location.',
      to: setup0,
    })
    out.push({
      key: 'ads_pre',
      title: 'Google Ads',
      description: 'Available after you connect Google — then pick an Ads account.',
      to: setup0,
    })
    out.push({
      key: 'lsa_pre',
      title: 'Google Local Service Ads',
      description: 'Available after you connect Google — then enable this integration.',
      to: setup0,
    })
  } else {
    if (!gaDone) {
      out.push({
        key: 'ga',
        title: 'Google Analytics',
        description: 'Select a GA4 property for this site.',
        to: `${base}/dashboard`,
      })
    }
    if (!gscDone) {
      out.push({
        key: 'gsc',
        title: 'Google Search Console',
        description: 'Link your verified Search Console property.',
        to: `${base}/search-console`,
      })
    }
    if (!lhDone) {
      out.push({
        key: 'lighthouse',
        title: 'Lighthouse',
        description: 'Enable performance, accessibility, and SEO audits.',
        to: `${base}/lighthouse`,
      })
    }
    if (!gbpDone) {
      out.push({
        key: 'gbp',
        title: 'Google Business Profile',
        description: 'Connect a Business Profile location.',
        to: `${base}/business-profile`,
      })
    }
    if (!adsDone) {
      out.push({
        key: 'ads',
        title: 'Google Ads',
        description: 'Link a Google Ads account for reporting.',
        to: `${base}/ads`,
      })
    }
    if (!lsaDone) {
      out.push({
        key: 'lsa',
        title: 'Google Local Service Ads',
        description: 'Enable Local Service Ads integration for this site.',
        to: `${base}/local-service-ads`,
      })
    }
  }

  if (woocommerceEnabled && !wooDone) {
    out.push({
      key: 'woo',
      title: 'WooCommerce',
      description: 'Connect your store REST API for order and revenue data.',
      to: `${base}/woocommerce`,
    })
  }
  if (!bingDone) {
    out.push({
      key: 'bing',
      title: 'Bing Webmaster',
      description: 'Add your Bing Webmaster API key for this site.',
      to: `${base}/bing-webmaster`,
    })
  }
  out.push({
    key: 'guided',
    title: 'Full guided setup',
    description: 'Walk through every step in order (you can still skip steps).',
    to: `${base}/setup`,
  })

  return out
})

function onGlobalPointerDown(e: MouseEvent) {
  const el = addIntegrationWrap.value
  if (!addIntegrationMenuOpen.value || !el) return
  if (!el.contains(e.target as Node)) addIntegrationMenuOpen.value = false
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') addIntegrationMenuOpen.value = false
}

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function getAuthUserId(): string | undefined {
  return pb.authStore.model?.id as string | undefined
}

async function waitForAuthId(timeoutMs = 10000, pollMs = 200): Promise<string | null> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const id = getAuthUserId()
    if (id) return id
    await new Promise((r) => setTimeout(r, pollMs))
  }
  return null
}

async function loadIntegrationFlags() {
  if (!site.value) {
    wooIntegrationConfigured.value = false
    bingIntegrationConfigured.value = false
    return
  }
  const sid = site.value.id
  const [w, b] = await Promise.all([
    woocommerceEnabled
      ? $fetch<{ configured: boolean }>('/api/woocommerce/config', {
          query: { siteId: sid },
          headers: authHeaders(),
        }).catch(() => ({ configured: false }))
      : Promise.resolve({ configured: false }),
    $fetch<{ configured: boolean }>('/api/bing-webmaster/config', {
      query: { siteId: sid },
      headers: authHeaders(),
    }).catch(() => ({ configured: false })),
  ])
  wooIntegrationConfigured.value = !!w.configured
  bingIntegrationConfigured.value = !!b.configured
}

async function loadSiteTasksForTasks() {
  if (!site.value) return
  const authId = getAuthUserId()
  if (!authId) {
    siteOpenTaskCount.value = 0
    return
  }

  siteTasksPending.value = true
  try {
    const page = await pb.collection('todo_tasks').getList(1, 1, {
      filter: `user = "${authId}" && status = "open" && site = "${site.value.id}"`,
    })
    siteOpenTaskCount.value = page.totalItems
  } catch {
    siteOpenTaskCount.value = 0
  } finally {
    siteTasksPending.value = false
  }
}

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
    if (!site.value) return
    await refreshPlan()
    const authId = await waitForAuthId()
    if (!authId) return
    googleStatus.value = await getStatus(site.value.id).catch(() => null)
    await loadIntegrationFlags()
    if (plan.value !== 'free' && plan.value !== 'starter') {
      await loadSiteTasksForTasks()
    } else {
      siteOpenTaskCount.value = 0
      siteTasksPending.value = false
    }
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  init()
  document.addEventListener('pointerdown', onGlobalPointerDown)
  document.addEventListener('keydown', onGlobalKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onGlobalPointerDown)
  document.removeEventListener('keydown', onGlobalKeydown)
})
watch(siteId, () => {
  addIntegrationMenuOpen.value = false
  init()
})
</script>
