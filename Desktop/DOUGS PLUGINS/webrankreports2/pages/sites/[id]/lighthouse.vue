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
      <div v-else-if="siteError" class="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
        <div class="flex items-center justify-center py-8">
          <div class="text-center">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Error Loading Site</h3>
            <p class="text-gray-600 mb-4">{{ siteError.message || 'Failed to load site data' }}</p>
          </div>
        </div>
      </div>

      <!-- Main Lighthouse Content -->
      <template v-else-if="site">
        <!-- Top Section: Site Info + Controls -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div class="flex-1">
              <h1 class="text-2xl font-bold text-gray-900 mb-2">Lighthouse</h1>
              <p class="text-sm text-gray-600">
                {{ site.name }} — {{ site.url }}
              </p>
              <p class="text-xs text-gray-500 mt-1">
                Strategy: {{ strategy === 'desktop' ? 'Desktop' : 'Mobile' }}
                <span v-if="latestRunAt"> • Last run: {{ new Date(latestRunAt).toLocaleString() }}</span>
              </p>
            </div>
            <div class="flex flex-col items-start md:items-end gap-3">
              <!-- Strategy Toggle -->
              <div class="inline-flex rounded-full bg-gray-100 p-1">
                <button
                  type="button"
                  @click="handleStrategyChange('mobile')"
                  :class="[
                    'px-3 py-1.5 text-sm rounded-full border transition-colors',
                    strategy === 'mobile'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  ]"
                  :disabled="loading"
                >
                  Mobile
                </button>
                <button
                  type="button"
                  @click="handleStrategyChange('desktop')"
                  :class="[
                    'px-3 py-1.5 text-sm rounded-full border transition-colors',
                    strategy === 'desktop'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  ]"
                  :disabled="loading"
                >
                  Desktop
                </button>
              </div>
              <!-- Run Buttons -->
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="handleRunAudit('mobile')"
                  :disabled="loading"
                  class="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                  :class="[
                    strategy === 'mobile'
                      ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
                    loading ? 'opacity-60 cursor-not-allowed' : ''
                  ]"
                >
                  Run Mobile Audit
                </button>
                <button
                  type="button"
                  @click="handleRunAudit('desktop')"
                  :disabled="loading"
                  class="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                  :class="[
                    strategy === 'desktop'
                      ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
                    loading ? 'opacity-60 cursor-not-allowed' : ''
                  ]"
                >
                  Run Desktop Audit
                </button>
              </div>
              <!-- Loading Indicator -->
              <div v-if="loading" class="flex items-center text-xs text-gray-500">
                <span class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></span>
                Running Lighthouse audit...
              </div>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p class="text-sm font-medium text-red-800">{{ error }}</p>
        </div>

        <!-- No Audits Yet -->
        <div v-if="!scores && !loading" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center mb-6">
          <svg class="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h4l2 3h7a1 1 0 011 1v2m0 4v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">No Lighthouse audits yet</h3>
          <p class="text-gray-600 mb-4">
            Run your first mobile or desktop audit to see performance, accessibility, and SEO scores.
          </p>
          <div class="flex items-center justify-center gap-3">
            <button
              type="button"
              @click="handleRunAudit('mobile')"
              class="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Run Mobile Audit
            </button>
            <button
              type="button"
              @click="handleRunAudit('desktop')"
              class="inline-flex items-center px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Run Desktop Audit
            </button>
          </div>
        </div>

        <template v-if="scores">
          <!-- Score Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <!-- Overall -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col">
              <span class="text-xs font-medium text-gray-500 mb-1">Overall</span>
              <div class="flex items-baseline gap-2">
                <span class="text-3xl font-bold text-gray-900">
                  {{ scores.overall ?? '–' }}
                </span>
                <span class="text-xs text-gray-500">out of 100</span>
              </div>
            </div>

            <!-- Performance -->
            <button
              @click="toggleCategory('performance')"
              :class="['bg-white rounded-xl border shadow-sm p-4 text-left hover:bg-gray-50 transition-all', expandedCategory === 'performance' ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200']"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-medium text-gray-500">Performance</span>
              </div>
              <div :class="['inline-flex items-center px-2 py-1 rounded-full text-sm font-semibold mt-1', scoreColorClass(scores.performance)]">
                <span>{{ scores.performance ?? '–' }}</span>
              </div>
            </button>

            <!-- Accessibility -->
            <button
              @click="toggleCategory('accessibility')"
              :class="['bg-white rounded-xl border shadow-sm p-4 text-left hover:bg-gray-50 transition-all', expandedCategory === 'accessibility' ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200']"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-medium text-gray-500">Accessibility</span>
              </div>
              <div :class="['inline-flex items-center px-2 py-1 rounded-full text-sm font-semibold mt-1', scoreColorClass(scores.accessibility)]">
                <span>{{ scores.accessibility ?? '–' }}</span>
              </div>
            </button>

            <!-- Best Practices -->
            <button
              @click="toggleCategory('bestPractices')"
              :class="['bg-white rounded-xl border shadow-sm p-4 text-left hover:bg-gray-50 transition-all', expandedCategory === 'bestPractices' ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200']"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-medium text-gray-500">Best Practices</span>
              </div>
              <div :class="['inline-flex items-center px-2 py-1 rounded-full text-sm font-semibold mt-1', scoreColorClass(scores.bestPractices)]">
                <span>{{ scores.bestPractices ?? '–' }}</span>
              </div>
            </button>

            <!-- SEO -->
            <button
              @click="toggleCategory('seo')"
              :class="['bg-white rounded-xl border shadow-sm p-4 text-left hover:bg-gray-50 transition-all', expandedCategory === 'seo' ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200']"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-medium text-gray-500">SEO</span>
              </div>
              <div :class="['inline-flex items-center px-2 py-1 rounded-full text-sm font-semibold mt-1', scoreColorClass(scores.seo)]">
                <span>{{ scores.seo ?? '–' }}</span>
              </div>
            </button>

            <!-- PWA -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-medium text-gray-500">PWA</span>
              </div>
              <div :class="['inline-flex items-center px-2 py-1 rounded-full text-sm font-semibold mt-1', scoreColorClass(scores.pwa)]">
                <span>{{ scores.pwa ?? '–' }}</span>
              </div>
            </div>
          </div>

          <!-- Category Details Box -->
          <div v-if="expandedCategory && categoryAudits" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-semibold text-gray-900 capitalize">
                {{ expandedCategory === 'bestPractices' ? 'Best Practices' : expandedCategory }} Audit Details
              </h3>
              <button
                @click="expandedCategory = null"
                class="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div v-if="getSelectedCategoryAudits()" class="space-y-4">
              <!-- Issues Found -->
              <div v-if="getSelectedCategoryAudits()!.errors.length > 0" class="space-y-2">
                <h4 class="text-xs font-semibold text-red-700 uppercase tracking-wide">Issues Found</h4>
                <div class="space-y-2">
                  <div
                    v-for="error in getSelectedCategoryAudits()!.errors"
                    :key="error.id"
                    class="bg-red-50 border border-red-200 rounded-lg p-3"
                  >
                    <div class="flex items-start gap-2">
                      <svg class="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-red-900">{{ error.title }}</p>
                        <p v-if="error.displayValue" class="text-xs text-red-700 mt-1">{{ error.displayValue }}</p>
                        <p v-if="error.description" class="text-xs text-red-600 mt-1" v-html="error.description.substring(0, 200) + (error.description.length > 200 ? '...' : '')"></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Passed Checks -->
              <div v-if="getSelectedCategoryAudits()!.passed.length > 0" class="space-y-2">
                <h4 class="text-xs font-semibold text-green-700 uppercase tracking-wide">Passed Checks</h4>
                <div class="space-y-2">
                  <div
                    v-for="item in getSelectedCategoryAudits()!.passed"
                    :key="item.id"
                    class="bg-green-50 border border-green-200 rounded-lg p-3"
                  >
                    <div class="flex items-start gap-2">
                      <svg class="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-green-900">{{ item.title }}</p>
                        <p v-if="item.displayValue" class="text-xs text-green-700 mt-1">{{ item.displayValue }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p v-if="getSelectedCategoryAudits()!.errors.length === 0 && getSelectedCategoryAudits()!.passed.length === 0" class="text-xs text-gray-500 text-center py-2">
                No audit details available for this category.
              </p>
            </div>
          </div>

          <!-- Core Web Vitals Metrics -->
          <div v-if="metrics" class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p class="text-xs text-gray-500 mb-1">FCP</p>
              <p class="text-lg font-semibold text-gray-900">
                {{ metrics.fcpMs != null && typeof metrics.fcpMs === 'number' ? (metrics.fcpMs / 1000).toFixed(2) + ' s' : '–' }}
              </p>
            </div>
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p class="text-xs text-gray-500 mb-1">LCP</p>
              <p class="text-lg font-semibold text-gray-900">
                {{ metrics.lcpMs != null && typeof metrics.lcpMs === 'number' ? (metrics.lcpMs / 1000).toFixed(2) + ' s' : '–' }}
              </p>
            </div>
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p class="text-xs text-gray-500 mb-1">CLS</p>
              <p class="text-lg font-semibold text-gray-900">
                {{ metrics.cls != null && typeof metrics.cls === 'number' ? metrics.cls.toFixed(3) : '–' }}
              </p>
            </div>
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p class="text-xs text-gray-500 mb-1">TBT</p>
              <p class="text-lg font-semibold text-gray-900">
                {{ metrics.tbtMs != null && typeof metrics.tbtMs === 'number' ? metrics.tbtMs + ' ms' : '–' }}
              </p>
            </div>
          </div>

          <!-- Screenshots Section -->
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mt-6 mb-6">
            <h2 class="text-sm font-semibold text-gray-900 mb-3">Page Screenshots</h2>
            <div v-if="screenshots?.final" class="rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
              <img
                :src="screenshots.final"
                alt="Lighthouse final screenshot"
                class="w-full h-auto"
              />
            </div>
            <div v-else class="h-48 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-300 rounded-xl">
              No screenshot available yet. Run an audit to generate one.
            </div>
          </div>

          <!-- Loading Sequence -->
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mt-6">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-sm font-semibold text-gray-900">Loading sequence</h2>
              <p class="text-xs text-gray-500">Frames from the latest {{ strategy }} Lighthouse audit.</p>
            </div>
            <div v-if="screenshots && screenshots.loadingSequence.length > 0" class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div
                v-for="(frame, index) in screenshots.loadingSequence"
                :key="index"
                class="bg-gray-100 rounded-lg overflow-hidden border border-gray-200"
              >
                <img
                  :src="frame.data"
                  :alt="`Frame ${index + 1}`"
                  class="w-full h-auto"
                />
                <div class="px-2 py-1 text-[10px] text-gray-500 text-right">
                  <span v-if="frame.timing !== null">{{ frame.timing.toFixed(0) }} ms</span>
                </div>
              </div>
            </div>
            <div v-else class="py-6 text-xs text-gray-400 text-center">
              No loading sequence frames available yet.
            </div>
          </div>
        </template>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from '#imports'
import { useSite } from '~/composables/useSite'
import { useLighthouse, type LighthouseCategoryAudits } from '~/composables/useLighthouse'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: false
})

const route = useRoute()
const siteId = computed(() => String(route.params.id || ''))

const { site, pending: sitePending, error: siteError } = useSite(siteId)
const {
  scores,
  metrics,
  screenshots,
  categoryAudits,
  strategy,
  latestRunAt,
  loading,
  error,
  loadLatestAudit,
  runAudit,
} = useLighthouse(siteId.value)

const expandedCategory = ref<string | null>(null)

const toggleCategory = (category: string) => {
  if (expandedCategory.value === category) {
    expandedCategory.value = null
  } else {
    expandedCategory.value = category
  }
}

const getSelectedCategoryAudits = () => {
  if (!expandedCategory.value || !categoryAudits.value) return null
  
  const categoryMap: Record<string, keyof typeof categoryAudits.value> = {
    performance: 'performance',
    accessibility: 'accessibility',
    bestPractices: 'bestPractices',
    seo: 'seo',
  }
  
  const key = categoryMap[expandedCategory.value]
  return key ? categoryAudits.value[key] : null
}

const { userInitials, fetchUserInitials, handleLogout } = useAuth()

const scoreColorClass = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return 'bg-gray-100 text-gray-600'
  }
  if (value >= 90) {
    return 'bg-emerald-50 text-emerald-700'
  }
  if (value >= 50) {
    return 'bg-yellow-50 text-yellow-700'
  }
  return 'bg-red-50 text-red-700'
}

const handleRunAudit = async (strat: 'mobile' | 'desktop') => {
  try {
    await runAudit(strat)
  } catch (err) {
    // Error is already handled by composable
    console.error('Failed to run audit:', err)
  }
}

const handleStrategyChange = async (strat: 'mobile' | 'desktop') => {
  await loadLatestAudit(strat)
}

onMounted(async () => {
  await fetchUserInitials()
  await loadLatestAudit('mobile')
})
</script>

