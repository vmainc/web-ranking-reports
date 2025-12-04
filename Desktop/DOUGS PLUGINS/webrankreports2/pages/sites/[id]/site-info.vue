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

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Back Link -->
      <NuxtLink
        :to="`/sites/${siteId}/dashboard`"
        class="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Site Dashboard
      </NuxtLink>

      <!-- Loading State -->
      <div v-if="!site && sitePending" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div class="flex items-center justify-center py-8">
          <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
            <p class="text-gray-600">Loading site data...</p>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="siteError || (error && !info)" class="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
        <div class="flex items-center justify-center py-8">
          <div class="text-center">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Error Loading Site Info</h3>
            <p class="text-gray-600 mb-4">{{ siteError?.message || error || 'Failed to load site information' }}</p>
            <button
              @click="fetchSiteInfo"
              class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <template v-else-if="site">
        <!-- Top Card - Site + Health Summary -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div class="flex-1">
              <h1 class="text-2xl font-bold text-gray-900 mb-2">Site Info</h1>
              <p class="text-gray-600 mb-2">
                <span class="font-medium">{{ site.name }}</span> — {{ site.url }}
              </p>
              <p v-if="info" class="text-sm text-gray-500 mb-4">
                Domain: <span class="font-medium">{{ info.site.domain || info.normalized.domain_name || 'Unknown' }}</span>
              </p>
              
              <!-- Health Badge -->
              <div v-if="info" class="mb-4">
                <span
                  :class="[
                    'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium',
                    healthStatus === 'ok' ? 'bg-green-100 text-green-800' : '',
                    healthStatus === 'warning' ? 'bg-yellow-100 text-yellow-800' : '',
                    healthStatus === 'critical' ? 'bg-red-100 text-red-800' : '',
                  ]"
                >
                  <svg
                    v-if="healthStatus === 'ok'"
                    class="w-4 h-4 mr-1.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  <svg
                    v-else-if="healthStatus === 'warning'"
                    class="w-4 h-4 mr-1.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                  <svg
                    v-else
                    class="w-4 h-4 mr-1.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                  Domain Health: {{ healthStatus === 'ok' ? 'OK' : healthStatus === 'warning' ? 'Warning' : 'Critical' }}
                </span>
              </div>

              <!-- Summary Chips -->
              <div v-if="info" class="flex flex-wrap gap-2">
                <span class="inline-flex items-center px-3 py-1 bg-gray-100 rounded-lg text-sm text-gray-700">
                  Domain Age: <span class="font-medium ml-1">{{ domainAgeDays !== null ? `${formatNumber(domainAgeDays)} days` : 'Unknown' }}</span>
                </span>
                <span class="inline-flex items-center px-3 py-1 bg-gray-100 rounded-lg text-sm text-gray-700">
                  Days to Expiry: <span class="font-medium ml-1">{{ daysToExpiry !== null ? `${formatNumber(daysToExpiry)} days` : 'Unknown' }}</span>
                </span>
                <span class="inline-flex items-center px-3 py-1 bg-gray-100 rounded-lg text-sm text-gray-700">
                  Registrar: <span class="font-medium ml-1">{{ registrarLabel || 'Unknown' }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading Info State -->
        <div v-if="loading && !info" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div class="flex items-center justify-center py-8">
            <div class="text-center">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
              <p class="text-gray-600">Loading domain information...</p>
            </div>
          </div>
        </div>

        <!-- Overview Cards -->
        <div v-if="info" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <!-- Domain Created Card -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-600">Domain Created</span>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="text-2xl font-bold text-gray-900 mb-1">
              {{ formatDate(info.normalized.create_date) }}
            </div>
            <p class="text-xs text-gray-500">Created on</p>
          </div>

          <!-- Expires Card -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-600">Expires</span>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="text-2xl font-bold text-gray-900 mb-1">
              {{ formatDate(info.normalized.expiry_date) }}
            </div>
            <p class="text-xs text-gray-500">Expiration date</p>
            <p v-if="info.normalized.days_to_expiry !== null && info.normalized.days_to_expiry <= 90" class="text-xs text-yellow-600 mt-1 font-medium">
              Renew soon
            </p>
          </div>

          <!-- Registration Status Card -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-600">Registration Status</span>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="text-2xl font-bold text-gray-900 mb-1">
              {{ info.normalized.domain_registered || 'Unknown' }}
            </div>
            <p class="text-xs text-gray-500">Registered status</p>
          </div>

          <!-- Nameservers Card -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-600">Nameservers</span>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
            <div class="text-lg font-bold text-gray-900 mb-1">
              {{ info.normalized.name_servers.length }} server{{ info.normalized.name_servers.length !== 1 ? 's' : '' }}
            </div>
            <div class="text-xs text-gray-600 space-y-0.5">
              <div v-for="(ns, index) in info.normalized.name_servers.slice(0, 2)" :key="index" class="truncate">
                {{ ns }}
              </div>
              <div v-if="info.normalized.name_servers.length > 2" class="text-gray-500">
                +{{ info.normalized.name_servers.length - 2 }} more
              </div>
            </div>
          </div>
        </div>

        <!-- Domain Health Explanation -->
        <div v-if="info" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Domain Health Status</h2>
          <div v-if="healthStatus === 'ok'" class="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <svg class="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <p class="text-sm text-green-800">
              Your domain appears healthy. Registration is active and not expiring soon.
            </p>
          </div>
          <div v-else-if="healthStatus === 'warning'" class="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <svg class="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <p class="text-sm text-yellow-800">
              Your domain is getting closer to expiry. It is a good idea to confirm auto-renew and verify contact info at your registrar.
            </p>
          </div>
          <div v-else class="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
            <svg class="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <p class="text-sm text-red-800">
              Domain may be expired or very close to expiry. Contact your registrar immediately to avoid downtime.
            </p>
          </div>
        </div>

        <!-- WHOIS Details Table -->
        <div v-if="info" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">WHOIS Details</h2>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <tbody class="bg-white divide-y divide-gray-200">
                <tr>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900 w-1/3">Domain name</td>
                  <td class="px-4 py-3 text-sm text-gray-600">{{ info.normalized.domain_name || 'Unknown' }}</td>
                </tr>
                <tr>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">Registrar</td>
                  <td class="px-4 py-3 text-sm text-gray-600">{{ info.normalized.domain_registrar || 'Unknown' }}</td>
                </tr>
                <tr>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">Created at</td>
                  <td class="px-4 py-3 text-sm text-gray-600">{{ formatDate(info.normalized.create_date) }}</td>
                </tr>
                <tr>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">Updated at</td>
                  <td class="px-4 py-3 text-sm text-gray-600">{{ formatDate(info.normalized.update_date) }}</td>
                </tr>
                <tr>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">Expires at</td>
                  <td class="px-4 py-3 text-sm text-gray-600">{{ formatDate(info.normalized.expiry_date) }}</td>
                </tr>
                <tr>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">Registered status</td>
                  <td class="px-4 py-3 text-sm text-gray-600">{{ info.normalized.domain_registered || 'Unknown' }}</td>
                </tr>
                <tr>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">Nameservers</td>
                  <td class="px-4 py-3 text-sm text-gray-600">
                    <div v-if="info.normalized.name_servers.length > 0" class="space-y-1">
                      <div v-for="(ns, index) in info.normalized.name_servers" :key="index">{{ ns }}</div>
                    </div>
                    <span v-else>Unknown</span>
                  </td>
                </tr>
                <tr>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">Domain age</td>
                  <td class="px-4 py-3 text-sm text-gray-600">
                    {{ domainAgeDays !== null ? `${formatNumber(domainAgeDays)} days` : 'Unknown' }}
                  </td>
                </tr>
                <tr>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">Days to expiry</td>
                  <td class="px-4 py-3 text-sm text-gray-600">
                    {{ daysToExpiry !== null ? `${formatNumber(daysToExpiry)} days` : 'Unknown' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from '#imports'
import { useSite } from '~/composables/useSite'
import { useSiteInfo } from '~/composables/useSiteInfo'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: false
})

const route = useRoute()
const siteId = computed(() => String(route.params.id || ''))

const { site, pending: sitePending, error: siteError } = useSite(siteId)
const { info, loading, error, healthStatus, fetchSiteInfo } = useSiteInfo(siteId)
const { userInitials, fetchUserInitials, handleLogout } = useAuth()

const formatDate = (value: string | null): string => {
  if (!value) return 'Unknown'
  try {
    const date = new Date(value)
    if (isNaN(date.getTime())) return 'Unknown'
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  } catch {
    return 'Unknown'
  }
}

const formatNumber = (value: number | null): string => {
  if (value === null) return 'Unknown'
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

const domainAgeDays = computed(() => {
  return info.value?.normalized.domain_age_days ?? null
})

const daysToExpiry = computed(() => {
  return info.value?.normalized.days_to_expiry ?? null
})

const registrarLabel = computed(() => {
  if (!info.value) return null
  const registrar = info.value.normalized.domain_registrar
  if (!registrar) return null
  // Truncate if too long
  if (registrar.length > 30) {
    return registrar.substring(0, 27) + '...'
  }
  return registrar
})

onMounted(async () => {
  await fetchUserInitials()
  if (site.value) {
    await fetchSiteInfo()
  }
})

// Watch for site to load, then fetch info
watch(() => site.value, async (newSite) => {
  if (newSite && !info.value && !loading.value) {
    await fetchSiteInfo()
  }
}, { immediate: true })

// Debug: Log info changes
watch(() => info.value, (newInfo) => {
  if (newInfo) {
    console.log('Info value updated:', {
      hasSite: !!newInfo.site,
      hasNormalized: !!newInfo.normalized,
      normalizedKeys: newInfo.normalized ? Object.keys(newInfo.normalized) : [],
      domainName: newInfo.normalized?.domain_name,
    })
  }
}, { immediate: true })
</script>

