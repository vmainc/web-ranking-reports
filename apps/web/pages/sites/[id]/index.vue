<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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
            <h2 class="text-lg font-medium text-surface-900">Integrations</h2>
            <NuxtLink
              :to="`/sites/${site.id}/full-report?preset=weekly_snapshot`"
              class="text-sm font-medium text-primary-600 hover:underline"
            >
              Weekly snapshot report →
            </NuxtLink>
          </div>
          <p class="mb-3 text-sm text-surface-500">
            Metrics for Analytics, Ads, Lighthouse, and WooCommerce live in the weekly snapshot. Open a connection below for the full tool.
          </p>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NuxtLink
              v-for="card in siteIntegrationCards"
              :key="card.key"
              :to="card.href"
              class="flex items-start gap-3 rounded-lg border border-surface-200 bg-white p-4 transition hover:border-primary-200 hover:shadow-sm"
            >
              <span
                class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded"
                :class="card.iconWrap"
              >
                <svg v-if="card.key === 'ga'" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <svg v-else-if="card.key === 'gsc'" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <svg v-else-if="card.key === 'lh'" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <svg v-else-if="card.key === 'ads'" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1c.256 0 .512.024.757.072M5.436 13.683L4.5 19.5m.957-5.817A4 4 0 0118 10.5" />
                </svg>
                <svg v-else-if="card.key === 'gbp'" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <svg v-else-if="card.key === 'woo'" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <svg v-else-if="card.key === 'bing'" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 3v16.5l4 2.5 8-4.5V8L9 5.5 5 3zm4 2.2l5.5 3.1v6.4L9 17.3V5.2z" />
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
                class="absolute left-0 right-0 z-30 mt-1 max-h-[min(70vh,22rem)] overflow-y-auto rounded-lg border border-surface-200 bg-white py-1 shadow-lg ring-1 ring-black/5 sm:left-auto sm:min-w-[min(100vw-2rem,22rem)]"
                @click.stop
              >
                <p class="border-b border-surface-100 px-3 py-2 text-xs font-medium text-surface-500">
                  Choose an integration to set up
                </p>
                <ul class="py-1">
                  <li v-for="opt in addIntegrationOptions" :key="opt.key">
                    <NuxtLink
                      :to="opt.to"
                      class="block px-3 py-2.5 text-left transition hover:bg-surface-50"
                      role="option"
                      @click="addIntegrationMenuOpen = false"
                    >
                      <span class="text-sm font-semibold text-surface-900">{{ opt.title }}</span>
                      <span class="mt-0.5 block text-xs text-surface-500">{{ opt.description }}</span>
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

        <section class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <h2 class="mb-3 text-lg font-medium text-surface-900">Tasks</h2>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NuxtLink
              :to="`/sites/${site.id}/to-do`"
              class="flex items-start gap-3 rounded-lg border border-surface-200 bg-white p-4 transition hover:border-primary-200 hover:shadow-sm"
            >
              <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary-100 text-primary-600">
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
              <span class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded bg-amber-100 text-amber-700">
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
              :to="`/sites/${site.id}/rank-tracking`"
              class="flex items-start gap-3 rounded-lg border border-surface-200 bg-white p-4 transition hover:border-primary-200 hover:shadow-sm"
            >
              <span class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded bg-emerald-100 text-emerald-700">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-surface-900">Check rank tracking</p>
                <p class="text-xs text-surface-500">Keywords and positions</p>
              </div>
            </NuxtLink>

            <NuxtLink
              :to="`/sites/${site.id}/backlinks`"
              class="flex items-start gap-3 rounded-lg border border-surface-200 bg-white p-4 transition hover:border-primary-200 hover:shadow-sm"
            >
              <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded bg-sky-100 text-sky-700">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </span>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-surface-900">Backlinks</p>
                <p class="mt-0.5 text-xs text-surface-500">Check links pointing back to your site</p>
              </div>
            </NuxtLink>

            <NuxtLink
              :to="`/sites/${site.id}/research`"
              class="flex items-start gap-3 rounded-lg border border-surface-200 bg-white p-4 transition hover:border-primary-200 hover:shadow-sm"
            >
              <span class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded bg-violet-100 text-violet-700">
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
              <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded bg-rose-100 text-rose-700">
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
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord } from '~/types'
import type { GoogleStatusResponse } from '~/composables/useGoogleIntegration'
import { getSite } from '~/services/sites'
import { useGoogleIntegration } from '~/composables/useGoogleIntegration'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()
const { getStatus } = useGoogleIntegration()

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
  iconWrap: string
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
      subtitle: g.selectedProperty.name || 'Property connected',
      href: `${base}/dashboard`,
      iconWrap: 'bg-orange-100 text-orange-700',
    })
  }
  if (g?.connected && g.selectedSearchConsoleSite) {
    out.push({
      key: 'gsc',
      title: 'Google Search Console',
      subtitle: g.selectedSearchConsoleSite.name || g.selectedSearchConsoleSite.siteUrl,
      href: `${base}/search-console`,
      iconWrap: 'bg-blue-100 text-blue-700',
    })
  }
  if (g?.providers?.lighthouse?.status === 'connected') {
    out.push({
      key: 'lh',
      title: 'Lighthouse',
      subtitle: 'Performance, accessibility, SEO audits',
      href: `${base}/lighthouse`,
      iconWrap: 'bg-fuchsia-100 text-fuchsia-700',
    })
  }
  if (g?.connected && g.selectedAdsCustomer) {
    out.push({
      key: 'ads',
      title: 'Google Ads',
      subtitle: g.selectedAdsCustomer.name || 'Account connected',
      href: `${base}/ads`,
      iconWrap: 'bg-amber-100 text-amber-800',
    })
  }
  if (g?.connected && g.selectedBusinessProfileLocation) {
    out.push({
      key: 'gbp',
      title: 'Google Business Profile',
      subtitle: g.selectedBusinessProfileLocation.name || 'Location connected',
      href: `${base}/business-profile`,
      iconWrap: 'bg-green-100 text-green-800',
    })
  }
  if (woocommerceEnabled && wooIntegrationConfigured.value) {
    out.push({
      key: 'woo',
      title: 'WooCommerce',
      subtitle: 'Store API connected',
      href: `${base}/woocommerce`,
      iconWrap: 'bg-violet-100 text-violet-700',
    })
  }
  if (bingIntegrationConfigured.value) {
    out.push({
      key: 'bing',
      title: 'Bing Webmaster',
      subtitle: 'API key configured',
      href: `${base}/bing-webmaster`,
      iconWrap: 'bg-teal-100 text-teal-800',
    })
  }
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
    const authId = await waitForAuthId()
    if (!authId) return
    googleStatus.value = await getStatus(site.value.id).catch(() => null)
    await loadIntegrationFlags()
    await loadSiteTasksForTasks()
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
