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
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading State -->
      <div v-if="sitePending" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div class="flex items-center justify-center py-8">
          <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
            <p class="text-gray-600">Loading site data...</p>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="siteError" class="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
        <div class="flex items-center justify-center py-8">
          <div class="text-center">
            <div class="text-red-600 mb-4">
              <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Error Loading Site</h3>
            <p class="text-gray-600 mb-4">{{ siteError.message || 'Failed to load site data' }}</p>
            <NuxtLink
              :to="`/sites/${siteId}/dashboard`"
              class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Back to Dashboard
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Site Content -->
      <template v-else-if="site">
        <!-- Back Link -->
        <div class="mb-6">
          <NuxtLink
            :to="`/sites/${siteId}/dashboard`"
            class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </NuxtLink>
        </div>

        <!-- Hero Card -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div class="flex-1">
              <h1 class="text-2xl font-bold text-gray-900 mb-2">Competition Analysis</h1>
              <p class="text-gray-600">Discover and analyze your competitors' SEO strategies</p>
            </div>
            <div class="flex items-center gap-3">
              <NuxtLink
                :to="`/sites/${siteId}/competition/gap`"
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Keyword Gap Analysis
              </NuxtLink>
              <button
                @click="showDiscoverModal = true"
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Discover Competitors
              </button>
            </div>
          </div>
        </div>

        <!-- Success/Error Messages -->
        <div v-if="successMessage" class="mb-4 bg-green-50 border border-green-200 rounded-xl p-4">
          <p class="text-sm text-green-700">{{ successMessage }}</p>
        </div>
        <div v-if="errorMessage" class="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <p class="text-sm text-red-700">{{ errorMessage }}</p>
        </div>

        <!-- Competitors Table -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">Competitors</h2>
            <p class="text-sm text-gray-500 mt-1">Track and analyze your competitors' SEO performance</p>
          </div>

          <!-- Loading State -->
          <div v-if="competitorsLoading" class="p-6 text-center">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
            <p class="text-sm text-gray-600">Loading competitors...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="competitorsError" class="p-6 text-center">
            <p class="text-sm text-red-600">{{ competitorsError }}</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="competitors.length === 0" class="p-12 text-center">
            <svg
              class="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No competitors found</h3>
            <p class="text-sm text-gray-500 mb-4">Discover competitors to start analyzing their SEO strategies</p>
            <button
              @click="showDiscoverModal = true"
              class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Discover Competitors
            </button>
          </div>

          <!-- Competitors Table -->
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discovery Source
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tech Stack
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discovered
                  </th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="competitor in competitors" :key="competitor.id" class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">{{ competitor.domain }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      :class="[
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        competitor.discovered_from === 'serp' ? 'bg-blue-50 text-blue-700' :
                        competitor.discovered_from === 'wappalyzer' ? 'bg-purple-50 text-purple-700' :
                        competitor.discovered_from === 'gsc' ? 'bg-green-50 text-green-700' :
                        'bg-gray-50 text-gray-700'
                      ]"
                    >
                      {{ competitor.discovered_from ? competitor.discovered_from.toUpperCase() : 'Unknown' }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-1 flex-wrap">
                      <span
                        v-for="(tech, index) in getTechStack(competitor.tech)"
                        :key="index"
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        {{ tech }}
                      </span>
                      <span v-if="getTechStack(competitor.tech).length === 0" class="text-xs text-gray-400">No tech data</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatDate(competitor.created_at) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <NuxtLink
                      :to="`/sites/${siteId}/competition/${competitor.id}`"
                      class="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      View Details
                    </NuxtLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </main>

    <!-- Discover Competitors Modal -->
    <div
      v-if="showDiscoverModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showDiscoverModal = false"
    >
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Discover Competitors</h3>
          <button
            @click="showDiscoverModal = false"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p class="text-sm text-gray-600 mb-4">
          Enter a URL to discover competitors using Wappalyzer, SERP, and Search Console data.
        </p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input
              v-model="discoverUrl"
              type="url"
              placeholder="https://example.com"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div class="flex items-center justify-end gap-3">
            <button
              @click="showDiscoverModal = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="handleDiscover"
              :disabled="discovering || !discoverUrl.trim()"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span v-if="discovering">Discovering...</span>
              <span v-else>Discover</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useNuxtApp } from '#imports'
import { useSite } from '~/composables/useSite'
import { useAuth } from '~/composables/useAuth'
import { useCompetition } from '~/composables/useCompetition'

definePageMeta({
  layout: false
})

const route = useRoute()
const siteId = computed(() => String(route.params.id || '').trim())

const { site, pending: sitePending, error: siteError } = useSite(siteId)
const { userInitials, handleLogout } = useAuth()

const {
  competitors,
  competitorsLoading,
  competitorsError,
  getCompetitors,
  discoverCompetitors,
} = useCompetition(siteId)

const showDiscoverModal = ref(false)
const discoverUrl = ref('')
const discovering = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Get tech stack as array
const getTechStack = (tech: Record<string, any>): string[] => {
  if (!tech || typeof tech !== 'object') return []
  return Object.keys(tech).slice(0, 5)
}

// Format date
const formatDate = (dateString: string): string => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Handle discover
const handleDiscover = async () => {
  if (!discoverUrl.value.trim()) return

  discovering.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const result = await discoverCompetitors(discoverUrl.value)
    successMessage.value = `Discovered ${result.count || 0} competitor${result.count !== 1 ? 's' : ''}`
    showDiscoverModal.value = false
    discoverUrl.value = ''
    setTimeout(() => { successMessage.value = '' }, 5000)
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to discover competitors'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  } finally {
    discovering.value = false
  }
}

// Initialize
onMounted(async () => {
  await getCompetitors()
  if (site.value?.url) {
    discoverUrl.value = site.value.url
  }
})
</script>
