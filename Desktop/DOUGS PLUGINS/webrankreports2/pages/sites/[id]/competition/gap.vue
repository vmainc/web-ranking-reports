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
      <div v-if="sitePending || loading" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div class="flex items-center justify-center py-8">
          <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
            <p class="text-gray-600">Loading gap analysis...</p>
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
            :to="`/sites/${siteId}/competition`"
            class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Competition
          </NuxtLink>
        </div>

        <!-- Hero Card -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div class="flex-1">
              <h1 class="text-2xl font-bold text-gray-900 mb-2">Keyword Gap Analysis</h1>
              <p class="text-gray-600">Global keyword opportunities across all competitors</p>
            </div>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-500 mb-1">Total Missing Keywords</p>
                <p class="text-3xl font-bold text-gray-900">{{ totalMissingKeywords }}</p>
              </div>
              <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-500 mb-1">Total Opportunities</p>
                <p class="text-3xl font-bold text-gray-900">{{ totalOpportunities }}</p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-500 mb-1">Competitors Analyzed</p>
                <p class="text-3xl font-bold text-gray-900">{{ competitors.length }}</p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- All Missing Keywords -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-900">All Missing Keywords</h2>
                <p class="text-sm text-gray-500 mt-1">Keywords your competitors rank for that you don't</p>
              </div>
              <div v-if="selectedKeywords.size > 0" class="flex items-center gap-3">
                <span class="text-sm font-medium text-indigo-900">
                  {{ selectedKeywords.size }} selected
                </span>
                <select
                  v-model="bulkAddListId"
                  class="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select list...</option>
                  <option v-for="list in lists" :key="list.id" :value="list.id">
                    {{ list.name }}
                  </option>
                </select>
                <button
                  @click="bulkAddKeywords"
                  :disabled="!bulkAddListId"
                  class="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Selected
                </button>
                <button
                  @click="selectedKeywords.clear()"
                  class="px-4 py-1.5 text-sm font-medium text-gray-700 bg-white rounded-lg hover:bg-gray-50 border border-gray-300 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="p-6 text-center">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
            <p class="text-sm text-gray-600">Analyzing competitors...</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="allMissingKeywords.length === 0" class="p-12 text-center">
            <svg
              class="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No missing keywords found</h3>
            <p class="text-sm text-gray-500 mb-4">Fetch keywords for competitors to see opportunities</p>
            <NuxtLink
              :to="`/sites/${siteId}/competition`"
              class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              View Competitors
            </NuxtLink>
          </div>

          <!-- Keywords Table -->
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      :checked="selectedKeywords.size === allMissingKeywords.length && allMissingKeywords.length > 0"
                      @change="toggleAllKeywords"
                      class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Keyword
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Competitor
                  </th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Their Position
                  </th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Est. Traffic
                  </th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Search Volume
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Add to List
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="keyword in allMissingKeywords" :key="`${keyword.competitorId}-${keyword.keyword}`" class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      :checked="selectedKeywords.has(`${keyword.competitorId}-${keyword.keyword}`)"
                      @change="toggleKeyword(`${keyword.competitorId}-${keyword.keyword}`, keyword.keyword)"
                      class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">{{ keyword.keyword }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">{{ keyword.competitorDomain }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {{ keyword.competitorPosition != null ? keyword.competitorPosition : 'N/A' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {{ formatNumber(keyword.estTraffic) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {{ formatNumber(keyword.searchVolume) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <select
                      @change="addKeywordToList(keyword.keyword, $event.target.value)"
                      class="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select list...</option>
                      <option v-for="list in lists" :key="list.id" :value="list.id">
                        {{ list.name }}
                      </option>
                    </select>
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
import { ref, computed, onMounted } from 'vue'
import { useRoute } from '#imports'
import { useSite } from '~/composables/useSite'
import { useAuth } from '~/composables/useAuth'
import { useCompetition } from '~/composables/useCompetition'
import { useKeywordLists } from '~/composables/useKeywordLists'
import { useKeywords } from '~/composables/useKeywords'

definePageMeta({
  layout: false
})

const route = useRoute()
const siteId = computed(() => String(route.params.id || '').trim())

const { site, pending: sitePending, error: siteError } = useSite(siteId)
const { userInitials, handleLogout } = useAuth()

const {
  competitors,
  competitorKeywords,
  getCompetitors,
  getCompetitorKeywords,
  computeKeywordGap,
} = useCompetition(siteId)

const { lists } = useKeywordLists(siteId)
const { addKeywords } = useKeywords(siteId)

const loading = ref(false)
const allMissingKeywords = ref<Array<{
  keyword: string
  competitorId: string
  competitorDomain: string
  competitorPosition: number | null
  estTraffic: number | null
  searchVolume: number | null
}>>([])
const selectedKeywords = ref(new Set<string>())
const selectedKeywordPhrases = ref(new Set<string>())
const bulkAddListId = ref('')
const successMessage = ref('')
const errorMessage = ref('')

// Computed totals
const totalMissingKeywords = computed(() => allMissingKeywords.value.length)
const totalOpportunities = computed(() => {
  return allMissingKeywords.value.reduce((sum, k) => sum + (k.estTraffic || 0), 0)
})

// Format number
const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined || num === 0) return 'N/A'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

// Toggle keyword selection
const toggleKeyword = (key: string, keyword: string) => {
  if (selectedKeywords.value.has(key)) {
    selectedKeywords.value.delete(key)
    selectedKeywordPhrases.value.delete(keyword)
  } else {
    selectedKeywords.value.add(key)
    selectedKeywordPhrases.value.add(keyword)
  }
}

// Toggle all keywords
const toggleAllKeywords = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  if (checked) {
    allMissingKeywords.value.forEach(k => {
      const key = `${k.competitorId}-${k.keyword}`
      selectedKeywords.value.add(key)
      selectedKeywordPhrases.value.add(k.keyword)
    })
  } else {
    selectedKeywords.value.clear()
    selectedKeywordPhrases.value.clear()
  }
}

// Add keyword to list
const addKeywordToList = async (keyword: string, listId: string) => {
  if (!listId) return

  try {
    await addKeywords([keyword], [listId])
    successMessage.value = `"${keyword}" added to list`
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to add keyword to list'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  }
}

// Bulk add keywords
const bulkAddKeywords = async () => {
  if (!bulkAddListId.value || selectedKeywordPhrases.value.size === 0) return

  try {
    const keywordsArray = Array.from(selectedKeywordPhrases.value)
    await addKeywords(keywordsArray, [bulkAddListId.value])
    successMessage.value = `Added ${keywordsArray.length} keyword${keywordsArray.length !== 1 ? 's' : ''} to list`
    selectedKeywords.value.clear()
    selectedKeywordPhrases.value.clear()
    bulkAddListId.value = ''
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to add keywords to list'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  }
}

// Load all gap data
const loadAllGapData = async () => {
  loading.value = true
  allMissingKeywords.value = []

  try {
    await getCompetitors()

    // Get gap data for each competitor
    for (const competitor of competitors.value) {
      await getCompetitorKeywords(competitor.id)
      const gap = await computeKeywordGap(competitor.id)

      // Add missing keywords with competitor info
      for (const keyword of gap.missingKeywords) {
        allMissingKeywords.value.push({
          keyword: keyword.keyword,
          competitorId: competitor.id,
          competitorDomain: competitor.domain,
          competitorPosition: keyword.competitorPosition,
          estTraffic: keyword.estTraffic,
          searchVolume: keyword.searchVolume,
        })
      }
    }

    // Sort by estimated traffic (descending)
    allMissingKeywords.value.sort((a, b) => (b.estTraffic || 0) - (a.estTraffic || 0))
  } catch (err: any) {
    console.error('Error loading gap data:', err)
    errorMessage.value = err.message || 'Failed to load gap analysis'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  } finally {
    loading.value = false
  }
}

// Initialize
onMounted(async () => {
  await loadAllGapData()
})
</script>

