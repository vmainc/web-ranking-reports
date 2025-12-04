<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header with Navigation -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <!-- Left: Logo -->
          <div class="flex items-center space-x-4">
            <NuxtLink to="/dashboard" class="flex items-center space-x-2">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="32" width="6" height="8" rx="2" fill="#F97316"/>
                <rect x="16" y="24" width="6" height="16" rx="2" fill="#14B8A6"/>
                <rect x="24" y="12" width="6" height="28" rx="2" fill="#3B82F6"/>
                <path d="M6 36 Q18 20 30 14" stroke="#EC4899" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                <path d="M28 12 L32 16 L28 20" stroke="#EC4899" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div>
                <h1 class="text-2xl font-bold text-gray-900">WebRanking</h1>
                <p class="text-sm text-gray-600 -mt-1">Reports</p>
              </div>
            </NuxtLink>
          </div>

          <!-- Right: Navigation Links -->
          <div class="flex items-center space-x-4">
            <NuxtLink
              to="/dashboard"
              class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Dashboard
            </NuxtLink>
            <NuxtLink
              to="/sites"
              class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Sites
            </NuxtLink>
            <NuxtLink
              to="/integrations"
              class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Integrations
            </NuxtLink>
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                <span class="text-white text-sm font-medium">{{ userInitials }}</span>
              </div>
            <button
              @click="handleLogout"
              class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Container -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <!-- Loading State -->
      <div v-if="pending" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div class="flex items-center justify-center py-8">
          <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
            <p class="text-gray-600">Loading site data...</p>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
        <div class="flex items-center justify-center py-8">
          <div class="text-center">
            <div class="text-red-600 mb-4">
              <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Error Loading Site</h3>
            <p class="text-gray-600 mb-4">{{ error.message || 'Failed to load site data' }}</p>
        <NuxtLink
              to="/dashboard"
              class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
              Back to Dashboard
        </NuxtLink>
          </div>
        </div>
      </div>
      
      <!-- Site Content -->
      <template v-else-if="site">
        <!-- Section 1: Site Hero -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <!-- Left Side: Site Info -->
            <div class="flex-1">
              <div class="flex items-center justify-between mb-2">
                <h1 class="text-3xl font-bold text-gray-900">{{ siteDisplayName }}</h1>
                <NuxtLink
                  :to="`/sites/${siteId}/settings/integrations`"
                  class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Integration Settings
                </NuxtLink>
              </div>
              <div class="flex items-center space-x-3 mb-3">
                <a
                  :href="siteUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  {{ siteUrl }}
                </a>
              </div>
              <div class="inline-flex items-center px-3 py-1 bg-gray-100 rounded-full">
                <span class="text-xs font-medium text-gray-700">Site ID: {{ siteId }}</span>
              </div>
            </div>

            <!-- Right Side: Status Chips -->
            <div class="flex flex-wrap gap-2 justify-end text-xs mt-4 md:mt-0">
              <!-- GA4 -->
              <span
                :class="[
                  'inline-flex items-center px-3 py-1 rounded-full font-medium',
                  ga4Connected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-gray-50 text-gray-600 border border-gray-200'
                ]"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full mr-2"
                  :class="ga4Connected ? 'bg-emerald-500' : 'bg-gray-400'"
                ></span>
                GA4: {{ ga4Connected ? 'Connected' : 'Not Connected' }}
              </span>

              <!-- Search Console -->
              <span
                :class="[
                  'inline-flex items-center px-3 py-1 rounded-full font-medium',
                  gscConnected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-gray-50 text-gray-600 border border-gray-200'
                ]"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full mr-2"
                  :class="gscConnected ? 'bg-emerald-500' : 'bg-gray-400'"
                ></span>
                Search Console: {{ gscConnected ? 'Connected' : 'Not Connected' }}
              </span>

              <!-- Ads -->
              <span
                :class="[
                  'inline-flex items-center px-3 py-1 rounded-full font-medium',
                  adsConnected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-gray-50 text-gray-600 border border-gray-200'
                ]"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full mr-2"
                  :class="adsConnected ? 'bg-emerald-500' : 'bg-gray-400'"
                ></span>
                Ads: {{ adsConnected ? 'Connected' : 'Not Connected' }}
              </span>

              <!-- Site Audit -->
              <span class="inline-flex items-center px-3 py-1 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                <span class="w-1.5 h-1.5 rounded-full mr-2 bg-indigo-500"></span>
                Site Audit: Ready
              </span>
            </div>
          </div>
        </div>

        <!-- Section 2: Action Cards by Category -->
        <section class="space-y-8">
          <div
            v-for="section in actionSections"
            :key="section.id"
            class="space-y-4"
          >
            <div>
              <h2 class="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                {{ section.title }}
              </h2>
              <p class="text-xs text-gray-500 mt-1">
                {{ section.description }}
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <NuxtLink
                v-for="action in section.actions"
                :key="action.id"
                :to="action.to"
                class="group bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col justify-between hover:border-indigo-500 hover:shadow-md transition"
              >
                <div class="flex items-start justify-between mb-4">
                  <div :class="action.iconBgClass">
                    <!-- Site Info Icon -->
                    <svg v-if="action.id === 'site-info'" class="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <!-- Analytics Health Icon -->
                    <svg v-else-if="action.id === 'analytics-health'" class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <!-- Lighthouse Icon -->
                    <svg v-else-if="action.id === 'lighthouse'" class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h4l2 3h7a1 1 0 011 1v2m0 4v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
                    </svg>
                    <!-- Analytics Icon -->
                    <svg v-else-if="action.id === 'analytics'" class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <!-- Search Console Icon -->
                    <svg v-else-if="action.id === 'search-console'" class="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <!-- Keyword Research Icon -->
                    <svg v-else-if="action.id === 'keyword-research'" class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <!-- Competition Icon -->
                    <svg v-else-if="action.id === 'competition'" class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <!-- Site Audit Icon -->
                    <svg v-else-if="action.id === 'site-audit'" class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <!-- Integration Settings Icon -->
                    <svg v-else-if="action.id === 'integration-settings'" class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <!-- Google Ads Icon -->
                    <svg v-else-if="action.id === 'google-ads'" class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <svg class="w-5 h-5 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ action.title }}</h3>
                  <p class="text-sm text-gray-600">{{ action.description }}</p>
                  <p v-if="action.extraText" :class="action.extraTextClass" class="text-xs mt-1 font-medium">
                    {{ action.extraText }}
                  </p>
                  <p v-if="action.extraTextFallback" class="text-xs text-gray-500 mt-1">
                    {{ action.extraTextFallback }}
                  </p>
                </div>
              </NuxtLink>
            </div>
          </div>
        </section>

      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const route = useRoute()
const router = useRouter()
const nuxtApp = useNuxtApp()

// Get Supabase client for future use
const $supabase = nuxtApp.$supabase

// Compute site ID from route params
const siteId = computed(() => String(route.params.id || ''))

// Use the useSite composable to fetch site data
const { site, pending, error } = useSite(siteId)

// Computed values for display
const siteDisplayName = computed(() => site.value?.name || 'Loading Site…')
const siteUrl = computed(() => site.value?.url || 'https://example.com')

// Use site integrations composable to fetch integration status
const { integration, ga4Connected, gscConnected, adsConnected, pending: integrationsPending, error: integrationsError } = useSiteIntegrations(siteId)

// Use Lighthouse composable to get latest score
const { latestScore: lighthouseScore, loadHistory: loadLighthouseHistory } = useLighthouse(siteId)

// Use auth composable for user initials and logout
const { userInitials, fetchUserInitials, handleLogout } = useAuth()

// Action sections configuration
const actionSections = computed(() => [
  {
    id: 'overview',
    title: 'Site Overview',
    description: 'High-level domain and health status.',
    actions: [
      {
        id: 'site-info',
        title: 'Site Info',
        description: 'Domain WHOIS and health status.',
        to: `/sites/${siteId.value}/site-info`,
        iconBgClass: 'bg-teal-100 rounded-lg p-3',
      },
      {
        id: 'analytics-health',
        title: 'Analytics Health',
        description: 'See overall tracking & traffic health score.',
        to: `/sites/${siteId.value}/health`,
        iconBgClass: 'bg-purple-100 rounded-lg p-3',
      },
      {
        id: 'lighthouse',
        title: 'Lighthouse Audits',
        description: 'Performance, Accessibility, SEO insights',
        to: `/sites/${siteId.value}/lighthouse`,
        iconBgClass: 'bg-amber-100 rounded-lg p-3',
        extraText: lighthouseScore.value !== null ? `Latest score: ${lighthouseScore.value}/100` : null,
        extraTextClass: 'text-indigo-600',
        extraTextFallback: lighthouseScore.value === null ? 'Run your first audit' : null,
      },
    ],
  },
  {
    id: 'traffic-seo',
    title: 'Traffic & SEO',
    description: 'Understand how visitors find and use your site.',
    actions: [
      {
        id: 'analytics',
        title: 'Analytics',
        description: 'View traffic, pages, and user insights.',
        to: `/sites/${siteId.value}/analytics`,
        iconBgClass: 'bg-emerald-100 rounded-lg p-3',
      },
      {
        id: 'search-console',
        title: 'Search Console',
        description: 'Search performance, queries, and rankings.',
        to: `/sites/${siteId.value}/search-console`,
        iconBgClass: 'bg-cyan-100 rounded-lg p-3',
      },
      {
        id: 'keyword-research',
        title: 'Keyword Research',
        description: 'Explore and organize your search phrases.',
        to: `/sites/${siteId.value}/keywords`,
        iconBgClass: 'bg-indigo-100 rounded-lg p-3',
      },
      {
        id: 'competition',
        title: 'Competition',
        description: 'Discover competitors and analyze keyword gaps.',
        to: `/sites/${siteId.value}/competition`,
        iconBgClass: 'bg-purple-100 rounded-lg p-3',
      },
    ],
  },
  {
    id: 'quality-tools',
    title: 'Site Quality & Tools',
    description: 'Check technical health and manage key integrations.',
    actions: [
      {
        id: 'site-audit',
        title: 'Site Audit',
        description: 'Run technical and on-page checks.',
        to: `/sites/${siteId.value}/audit`,
        iconBgClass: 'bg-green-100 rounded-lg p-3',
      },
      {
        id: 'integration-settings',
        title: 'Integration Settings',
        description: 'Manage GA4, Search Console, and Ads connections.',
        to: `/sites/${siteId.value}/settings/integrations`,
        iconBgClass: 'bg-indigo-100 rounded-lg p-3',
      },
    ],
  },
  {
    id: 'ads-campaigns',
    title: 'Ads & Campaigns',
    description: 'Review and optimize your ad performance.',
    actions: [
      {
        id: 'google-ads',
        title: 'Google Ads',
        description: 'Plan and review campaigns.',
        to: `/sites/${siteId.value}/ads`,
        iconBgClass: 'bg-blue-100 rounded-lg p-3',
      },
    ],
  },
])

// Get user initials from Supabase user data and load Lighthouse history
onMounted(async () => {
  await fetchUserInitials()
  await loadLighthouseHistory(1)
})
</script>
