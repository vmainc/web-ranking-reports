<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <!-- Left: Logo -->
          <NuxtLink to="/dashboard" class="flex items-center space-x-2">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="32" width="6" height="8" rx="2" fill="#F97316" />
              <rect x="16" y="24" width="6" height="16" rx="2" fill="#14B8A6" />
              <rect x="24" y="12" width="6" height="28" rx="2" fill="#3B82F6" />
              <path d="M6 36 Q18 20 30 14" stroke="#EC4899" stroke-width="2.5" fill="none" stroke-linecap="round" />
              <path d="M28 12 L32 16 L28 20" stroke="#EC4899" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <div>
              <h1 class="text-xl font-bold text-gray-900">WebRanking</h1>
              <p class="text-xs text-gray-600 -mt-0.5">Reports</p>
            </div>
          </NuxtLink>

          <!-- Right: Nav -->
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

    <!-- Main -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Integrations Manager</h1>
        <p class="text-sm text-gray-600 mt-1">
          Admin overview of GA4, Search Console, and Google Ads connections across all sites.
        </p>
        <p class="text-xs text-gray-500 mt-1">
          Access restricted to <span class="font-mono">doughigson@gmail.com</span>.
        </p>
      </div>

      <!-- Not authorized -->
      <div v-if="notAuthorized" class="bg-red-50 border border-red-200 rounded-xl p-4">
        <h2 class="text-sm font-semibold text-red-800 mb-1">Access denied</h2>
        <p class="text-sm text-red-700">
          You do not have permission to view this page.
        </p>
      </div>

      <template v-else>
        <!-- Controls -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div class="flex-1">
              <label class="block text-xs font-medium text-gray-700 mb-1">Search sites</label>
              <input
                v-model="search"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Search by site name or URL"
              />
            </div>
            <div class="flex items-center gap-2">
              <input
                id="needs-attention"
                v-model="showNeedsAttentionOnly"
                type="checkbox"
                class="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
              <label for="needs-attention" class="text-xs text-gray-700">
                Show only sites needing attention
              </label>
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p class="text-sm text-red-700">{{ error }}</p>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
          <p class="text-sm text-gray-600">Loading integrations...</p>
        </div>

        <!-- Table -->
        <div v-else class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Site
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    URL
                  </th>
                  <th scope="col" class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    GA4
                  </th>
                  <th scope="col" class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Search Console
                  </th>
                  <th scope="col" class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Google Ads
                  </th>
                  <th scope="col" class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-100">
                <tr
                  v-for="row in filteredItems"
                  :key="row.site_id"
                  class="hover:bg-gray-50"
                >
                  <td class="px-4 py-3 text-sm text-indigo-700 font-medium">
                    <NuxtLink :to="`/sites/${row.site_id}/settings/integrations`" class="hover:underline">
                      {{ row.site_name }}
                    </NuxtLink>
                  </td>
                  <td class="px-4 py-3 text-xs text-gray-600">
                    {{ row.site_url }}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span
                      :class="[
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        row.ga4_connected
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-50 text-gray-600 border border-gray-200'
                      ]"
                    >
                      {{ row.ga4_connected ? 'Connected' : 'Not connected' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span
                      :class="[
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        row.gsc_connected
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-50 text-gray-600 border border-gray-200'
                      ]"
                    >
                      {{ row.gsc_connected ? 'Connected' : 'Not connected' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span
                      :class="[
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        row.ads_connected
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-50 text-gray-600 border border-gray-200'
                      ]"
                    >
                      {{ row.ads_connected ? 'Connected' : 'Not connected' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right text-xs text-gray-500">
                    {{ formatDateTime(row.integrations_updated_at || row.created_at) }}
                  </td>
                </tr>
                <tr v-if="!loading && filteredItems.length === 0">
                  <td colspan="6" class="px-4 py-6 text-center text-sm text-gray-500">
                    No sites match your filters.
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
import { onMounted, computed } from 'vue'
import { useRouter } from '#app'
import { useAdminIntegrations } from '~/composables/useAdminIntegrations'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: false
})

const router = useRouter()
const { user, userInitials, fetchUserInitials, handleLogout } = useAuth()
const {
  items,
  loading,
  error,
  search,
  showNeedsAttentionOnly,
  filteredItems,
  fetchAdminIntegrations
} = useAdminIntegrations()

const notAuthorized = computed(() => {
  const email = user.value?.email || ''
  return email !== 'doughigson@gmail.com'
})

const formatDateTime = (value: string | null): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(async () => {
  await fetchUserInitials()

  if (!notAuthorized.value) {
    await fetchAdminIntegrations()
  }
})
</script>

