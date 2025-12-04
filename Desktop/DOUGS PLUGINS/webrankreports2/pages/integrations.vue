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
              class="text-indigo-600 hover:text-indigo-900 px-3 py-2 rounded-md text-sm font-medium font-semibold"
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

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Integrations</h1>
        <p class="text-gray-600 mt-2">Connect your tools and services to enhance your ranking reports.</p>
      </div>

      <!-- Connected Integrations -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Connected Integrations</h2>
        <div v-if="connectedIntegrations.length > 0" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="integration in connectedIntegrations"
            :key="integration.id"
            class="bg-white rounded-xl border border-green-200 shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center space-x-3">
                <div :class="`${integration.iconBg} rounded-lg p-3`">
                  <component :is="integration.icon" :class="`w-6 h-6 ${integration.iconColor}`" />
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">{{ integration.name }}</h3>
                  <p class="text-sm text-gray-500">{{ integration.category }}</p>
                </div>
              </div>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Connected
              </span>
            </div>
            <p class="text-sm text-gray-600 mb-4">{{ integration.description }}</p>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Last synced: {{ integration.lastSynced || 'Never' }}</span>
              <button
                @click="disconnectIntegration(integration.id)"
                class="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
        <div v-else class="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No connected integrations</h3>
          <p class="text-gray-600">Connect your first integration to get started.</p>
        </div>
      </div>

      <!-- Available Integrations -->
      <div>
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Available Integrations</h2>
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="integration in availableIntegrations"
            :key="integration.id"
            class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center space-x-3">
                <div :class="`${integration.iconBg} rounded-lg p-3`">
                  <component :is="integration.icon" :class="`w-6 h-6 ${integration.iconColor}`" />
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">{{ integration.name }}</h3>
                  <p class="text-sm text-gray-500">{{ integration.category }}</p>
                </div>
              </div>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                Available
              </span>
            </div>
            <p class="text-sm text-gray-600 mb-4">{{ integration.description }}</p>
            <div class="flex items-center justify-between">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="feature in integration.features"
                  :key="feature"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                >
                  {{ feature }}
                </span>
              </div>
              <button
                @click="connectIntegration(integration.id)"
                class="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: false
})

const { userInitials, fetchUserInitials, handleLogout } = useAuth()
const nuxtApp = useNuxtApp()
const $supabase = nuxtApp.$supabase

// Define icon components inline
const GoogleIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
    </svg>
  `
}

const ChartIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
    </svg>
  `
}

const ClipboardIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
    </svg>
  `
}

const MegaphoneIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path>
    </svg>
  `
}

// Integration data
const connectedIntegrations = ref<any[]>([])
const availableIntegrations = ref([
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    category: 'Analytics',
    description: 'Track website traffic, user behavior, and organic sessions.',
    icon: GoogleIcon,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    features: ['Traffic Data', 'User Metrics', 'Organic Sessions']
  },
  {
    id: 'gsc',
    name: 'Google Search Console',
    category: 'SEO',
    description: 'Monitor search performance, keyword rankings, and average positions.',
    icon: GoogleIcon,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    features: ['Keyword Rankings', 'Average Position', 'Search Data']
  },
  {
    id: 'site-audit',
    name: 'Site Audit',
    category: 'SEO Tools',
    description: 'Automated technical SEO audits and performance checks.',
    icon: ClipboardIcon,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    features: ['Technical SEO', 'Health Score', 'Core Web Vitals']
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    category: 'Advertising',
    description: 'Connect your Google Ads account to track campaign performance.',
    icon: MegaphoneIcon,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    features: ['Campaign Data', 'Conversion Tracking', 'Ad Performance']
  },
  {
    id: 'lighthouse',
    name: 'Lighthouse',
    category: 'Performance',
    description: 'Monitor Core Web Vitals and site performance metrics.',
    icon: ChartIcon,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    features: ['Core Web Vitals', 'Performance Score', 'Page Speed']
  }
])

// Fetch connected integrations
const fetchConnectedIntegrations = async () => {
  // TODO: Replace with actual Supabase query to fetch user's connected integrations
  // For now, return empty array - this will be implemented when integration storage is set up
  connectedIntegrations.value = []
}

// Connect an integration
const connectIntegration = async (integrationId: string) => {
  // TODO: Implement actual connection logic
  // This will involve OAuth flows for Google services, API key entry, etc.
  alert(`Connecting ${integrationId}... This feature will be implemented soon.`)
  
  // For now, just show a placeholder message
  // In the future, this will:
  // 1. Open OAuth flow for Google services
  // 2. Store connection tokens in Supabase
  // 3. Refresh the connected integrations list
}

// Disconnect an integration
const disconnectIntegration = async (integrationId: string) => {
  if (!confirm(`Are you sure you want to disconnect ${integrationId}?`)) {
    return
  }
  
  // TODO: Implement actual disconnection logic
  // This will remove tokens from Supabase and update the connected list
  alert(`Disconnecting ${integrationId}... This feature will be implemented soon.`)
}

onMounted(async () => {
  await fetchUserInitials()
  await fetchConnectedIntegrations()
  
  // Filter out connected integrations from available list
  const connectedIds = connectedIntegrations.value.map(i => i.id)
  availableIntegrations.value = availableIntegrations.value.filter(
    i => !connectedIds.includes(i.id)
  )
})
</script>
