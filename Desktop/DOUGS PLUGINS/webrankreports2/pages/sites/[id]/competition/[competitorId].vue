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
      <div v-if="sitePending || loadingCompetitor" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div class="flex items-center justify-center py-8">
          <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
            <p class="text-gray-600">Loading competitor data...</p>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="siteError || !competitor" class="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
        <div class="flex items-center justify-center py-8">
          <div class="text-center">
            <div class="text-red-600 mb-4">
              <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Competitor Not Found</h3>
            <p class="text-gray-600 mb-4">The competitor you're looking for doesn't exist or you don't have access to it.</p>
            <NuxtLink
              :to="`/sites/${siteId}/competition`"
              class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Back to Competition
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Competitor Content -->
      <template v-else-if="site && competitor">
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
              <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ competitor.domain }}</h1>
              <p class="text-gray-600">Competitor analysis and keyword gap</p>
            </div>
            <div class="flex items-center gap-3">
              <button
                @click="handleFetchKeywords"
                :disabled="fetchingKeywords"
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg v-if="fetchingKeywords" class="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {{ fetchingKeywords ? 'Fetching...' : 'Fetch Keywords' }}
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

        <!-- Charts Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <!-- Overlap Chart -->
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Keyword Overlap</h3>
            <div class="h-64">
              <canvas ref="overlapChartRef"></canvas>
            </div>
          </div>

          <!-- Category Breakdown -->
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
            <div class="h-64">
              <canvas ref="categoryChartRef"></canvas>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="border-b border-gray-200">
            <nav class="flex -mb-px">
              <button
                @click="activeTab = 'shared'"
                :class="[
                  'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'shared'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                ]"
              >
                Shared Keywords ({{ gapData.sharedKeywords.length }})
              </button>
              <button
                @click="activeTab = 'missing'"
                :class="[
                  'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'missing'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                ]"
              >
                Missing Keywords ({{ gapData.missingKeywords.length }})
              </button>
              <button
                @click="activeTab = 'strength'"
                :class="[
                  'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'strength'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                ]"
              >
                Your Strength ({{ gapData.yourStrengthKeywords.length }})
              </button>
            </nav>
          </div>

          <div class="p-6">
            <!-- Shared Keywords Tab -->
            <div v-if="activeTab === 'shared'">
              <div v-if="gapData.sharedKeywords.length === 0" class="text-center py-8">
                <p class="text-gray-500">No shared keywords found</p>
              </div>
              <div v-else class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          :checked="selectedKeywords.size === displayedKeywords.length && displayedKeywords.length > 0"
                          @change="toggleAllKeywords"
                          class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Keyword
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Your Position
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Their Position
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Search Volume
                      </th>
                      <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Add to List
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="keyword in displayedKeywords" :key="keyword.keyword" class="hover:bg-gray-50">
                      <td class="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          :checked="selectedKeywords.has(keyword.keyword)"
                          @change="toggleKeyword(keyword.keyword)"
                          class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">{{ keyword.keyword }}</div>
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                        {{ keyword.yourPosition != null ? keyword.yourPosition : 'N/A' }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                        {{ keyword.competitorPosition != null ? keyword.competitorPosition : 'N/A' }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                        {{ formatNumber(keyword.searchVolume) }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap">
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

            <!-- Missing Keywords Tab -->
            <div v-if="activeTab === 'missing'">
              <div v-if="gapData.missingKeywords.length === 0" class="text-center py-8">
                <p class="text-gray-500">No missing keywords found</p>
              </div>
              <div v-else class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          :checked="selectedKeywords.size === displayedKeywords.length && displayedKeywords.length > 0"
                          @change="toggleAllKeywords"
                          class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Keyword
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Their Position
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Est. Traffic
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Search Volume
                      </th>
                      <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Add to List
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="keyword in displayedKeywords" :key="keyword.keyword" class="hover:bg-gray-50">
                      <td class="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          :checked="selectedKeywords.has(keyword.keyword)"
                          @change="toggleKeyword(keyword.keyword)"
                          class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">{{ keyword.keyword }}</div>
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                        {{ keyword.competitorPosition != null ? keyword.competitorPosition : 'N/A' }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                        {{ formatNumber(keyword.estTraffic) }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                        {{ formatNumber(keyword.searchVolume) }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap">
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

            <!-- Your Strength Tab -->
            <div v-if="activeTab === 'strength'">
              <div v-if="gapData.yourStrengthKeywords.length === 0" class="text-center py-8">
                <p class="text-gray-500">No strength keywords found</p>
              </div>
              <div v-else class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          :checked="selectedKeywords.size === displayedKeywords.length && displayedKeywords.length > 0"
                          @change="toggleAllKeywords"
                          class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Keyword
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Your Position
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Search Volume
                      </th>
                      <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Add to List
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="keyword in displayedKeywords" :key="keyword.keyword" class="hover:bg-gray-50">
                      <td class="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          :checked="selectedKeywords.has(keyword.keyword)"
                          @change="toggleKeyword(keyword.keyword)"
                          class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">{{ keyword.keyword }}</div>
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                        {{ keyword.yourPosition != null ? keyword.yourPosition : 'N/A' }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                        {{ formatNumber(keyword.searchVolume) }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap">
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

            <!-- Bulk Actions -->
            <div v-if="selectedKeywords.size > 0" class="mt-4 flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <span class="text-sm font-medium text-indigo-900">
                {{ selectedKeywords.size }} keyword{{ selectedKeywords.size !== 1 ? 's' : '' }} selected
              </span>
              <div class="flex items-center gap-3">
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
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useNuxtApp } from '#imports'
import { useSite } from '~/composables/useSite'
import { useAuth } from '~/composables/useAuth'
import { useCompetition } from '~/composables/useCompetition'
import { useKeywordLists } from '~/composables/useKeywordLists'
import { useKeywords } from '~/composables/useKeywords'
// Chart.js imports - using dynamic import for Nuxt 3
let ChartJS: any = null
let chartLoaded = false

const loadChartJS = async () => {
  if (chartLoaded) return
  
  try {
    const chartModule = await import('chart.js/auto')
    ChartJS = chartModule.default || chartModule.Chart
    chartLoaded = true
  } catch (err) {
    console.error('Failed to load Chart.js:', err)
  }
}

definePageMeta({
  layout: false
})

const route = useRoute()
const siteId = computed(() => String(route.params.id || '').trim())
const competitorId = computed(() => String(route.params.competitorId || '').trim())

const { site, pending: sitePending, error: siteError } = useSite(siteId)
const { userInitials, handleLogout } = useAuth()

const {
  competitors,
  competitorKeywords,
  keywordsLoading,
  keywordsError,
  getCompetitors,
  fetchCompetitorKeywords,
  getCompetitorKeywords,
  computeKeywordGap,
} = useCompetition(siteId)

const { lists } = useKeywordLists(siteId)
const { addKeywords } = useKeywords(siteId)

const competitor = computed(() => competitors.value.find(c => c.id === competitorId.value))
const loadingCompetitor = ref(false)
const fetchingKeywords = ref(false)
const activeTab = ref<'shared' | 'missing' | 'strength'>('shared')
const gapData = ref({
  sharedKeywords: [] as any[],
  missingKeywords: [] as any[],
  yourStrengthKeywords: [] as any[],
})
const selectedKeywords = ref(new Set<string>())
const bulkAddListId = ref('')
const successMessage = ref('')
const errorMessage = ref('')

const overlapChartRef = ref<HTMLCanvasElement | null>(null)
const categoryChartRef = ref<HTMLCanvasElement | null>(null)
let overlapChart: any = null
let categoryChart: any = null

// Get displayed keywords based on active tab
const displayedKeywords = computed(() => {
  if (activeTab.value === 'shared') {
    return gapData.value.sharedKeywords
  } else if (activeTab.value === 'missing') {
    return gapData.value.missingKeywords
  } else {
    return gapData.value.yourStrengthKeywords
  }
})

// Format number
const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined || num === 0) return 'N/A'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

// Toggle keyword selection
const toggleKeyword = (keyword: string) => {
  if (selectedKeywords.value.has(keyword)) {
    selectedKeywords.value.delete(keyword)
  } else {
    selectedKeywords.value.add(keyword)
  }
}

// Toggle all keywords
const toggleAllKeywords = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  if (checked) {
    displayedKeywords.value.forEach(k => selectedKeywords.value.add(k.keyword))
  } else {
    displayedKeywords.value.forEach(k => selectedKeywords.value.delete(k.keyword))
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
  if (!bulkAddListId.value || selectedKeywords.value.size === 0) return

  try {
    const keywordsArray = Array.from(selectedKeywords.value)
    await addKeywords(keywordsArray, [bulkAddListId.value])
    successMessage.value = `Added ${keywordsArray.length} keyword${keywordsArray.length !== 1 ? 's' : ''} to list`
    selectedKeywords.value.clear()
    bulkAddListId.value = ''
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to add keywords to list'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  }
}

// Handle fetch keywords
const handleFetchKeywords = async () => {
  if (!competitor.value) return

  fetchingKeywords.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await fetchCompetitorKeywords(competitor.value.id, competitor.value.domain)
    await loadGapData()
    successMessage.value = 'Keywords fetched successfully'
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to fetch keywords'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  } finally {
    fetchingKeywords.value = false
  }
}

// Load gap data
const loadGapData = async () => {
  if (!competitorId.value) return

  loadingCompetitor.value = true
  try {
    const gap = await computeKeywordGap(competitorId.value)
    gapData.value = gap
    await nextTick()
    updateCharts()
  } catch (err: any) {
    console.error('Error loading gap data:', err)
    errorMessage.value = err.message || 'Failed to load gap data'
  } finally {
    loadingCompetitor.value = false
  }
}

// Update charts
const updateCharts = async () => {
  if (!overlapChartRef.value || !categoryChartRef.value) return

  await loadChartJS()

  // Overlap Radar Chart
  if (overlapChart) {
    overlapChart.destroy()
  }

  const sharedCount = gapData.value.sharedKeywords.length
  const missingCount = gapData.value.missingKeywords.length
  const strengthCount = gapData.value.yourStrengthKeywords.length
  const total = sharedCount + missingCount + strengthCount

  if (!ChartJS) {
    console.error('Chart.js not loaded')
    return
  }

  overlapChart = new ChartJS(overlapChartRef.value, {
    type: 'radar',
    data: {
      labels: ['Shared Keywords', 'Missing Opportunities', 'Your Strengths'],
      datasets: [
        {
          label: 'Keyword Distribution',
          data: [
            total > 0 ? (sharedCount / total) * 100 : 0,
            total > 0 ? (missingCount / total) * 100 : 0,
            total > 0 ? (strengthCount / total) * 100 : 0,
          ],
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
        },
      },
    },
  })

  // Category Bar Chart
  if (categoryChart) {
    categoryChart.destroy()
  }

  categoryChart = new ChartJS(categoryChartRef.value, {
    type: 'bar',
    data: {
      labels: ['Shared', 'Missing', 'Your Strength'],
      datasets: [
        {
          label: 'Keywords',
          data: [sharedCount, missingCount, strengthCount],
          backgroundColor: [
            'rgba(99, 102, 241, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(34, 197, 94, 0.8)',
          ],
          borderColor: [
            'rgba(99, 102, 241, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(34, 197, 94, 1)',
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  })
}

// Watch for tab changes to update displayed keywords
watch(activeTab, () => {
  selectedKeywords.value.clear()
})

// Initialize
onMounted(async () => {
  await getCompetitors()
  if (competitor.value) {
    await getCompetitorKeywords(competitor.value.id)
    await loadGapData()
  }
})
</script>
