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

      <!-- Hero Card -->
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Site Audit Overview</h1>
        <p class="text-gray-600 mb-4">
          Run technical and on-page checks for your site. Analyze performance, SEO issues, and get actionable recommendations.
        </p>
        <div class="flex flex-wrap gap-3 items-center mb-4">
          <div
            :class="[
              'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border',
              ga4Connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-50 text-gray-600 border-gray-200'
            ]"
          >
            <span
              class="w-1.5 h-1.5 rounded-full mr-2"
              :class="ga4Connected ? 'bg-emerald-500' : 'bg-gray-400'"
            ></span>
            GA4: {{ ga4Connected ? 'Connected' : 'Not Connected' }}
          </div>
          <div
            :class="[
              'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border',
              gscConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-50 text-gray-600 border-gray-200'
            ]"
          >
            <span
              class="w-1.5 h-1.5 rounded-full mr-2"
              :class="gscConnected ? 'bg-emerald-500' : 'bg-gray-400'"
            ></span>
            Search Console: {{ gscConnected ? 'Connected' : 'Not Connected' }}
          </div>
        </div>
        <div class="flex flex-wrap gap-3 mt-4">
          <button
            @click="runAudit"
            :disabled="auditRunning"
            class="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg v-if="auditRunning" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span v-if="auditRunning">Running...</span>
            <span v-else>{{ auditResults ? 'Rerun Site Audit' : 'Run Site Audit' }}</span>
          </button>
        </div>
        <div v-if="loadingStoredResults" class="mt-4 text-sm text-gray-500">
          Loading stored audit results...
        </div>
        <div v-if="auditError" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-800 font-medium mb-1">Audit Error</p>
          <p class="text-sm text-red-700">{{ auditError }}</p>
        </div>
        <div v-if="auditResults && !auditRunning" class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-green-800">Audit completed on {{ formatDate(auditResults.auditDate) }}</p>
              <p v-if="auditResults.pagesAnalyzed" class="text-xs text-green-700 mt-1">
                Analyzed {{ auditResults.pagesAnalyzed }} {{ auditResults.pagesAnalyzed === 1 ? 'page' : 'pages' }}
              </p>
            </div>
            <div v-if="auditResults.overallScore !== undefined" class="text-right">
              <p class="text-xs text-green-700 mb-1">Overall Score</p>
              <p class="text-2xl font-bold text-green-800">{{ auditResults.overallScore }}/100</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Audit Summary Card (shown when results are available) -->
      <div v-if="auditResults && !auditRunning" class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 shadow-sm p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-gray-900">Audit Summary</h2>
          <div class="flex items-center space-x-4">
            <div v-if="auditResults.pagesAnalyzed" class="text-right">
              <p class="text-xs text-gray-600 uppercase tracking-wide">Pages Analyzed</p>
              <p class="text-2xl font-bold text-indigo-700">{{ auditResults.pagesAnalyzed }}</p>
            </div>
            <div v-if="auditResults.overallScore !== undefined" class="text-right">
              <p class="text-xs text-gray-600 uppercase tracking-wide">Overall Score</p>
              <p class="text-2xl font-bold text-purple-700">{{ auditResults.overallScore }}/100</p>
            </div>
          </div>
        </div>
        <p v-if="auditResults.summary" class="text-sm text-gray-700 leading-relaxed">{{ auditResults.summary }}</p>
      </div>

      <!-- 2x2 Grid of Audit Sections -->
      <div class="grid gap-6 md:grid-cols-2">
        <!-- Technical Health Card -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold text-gray-900">Technical Health</h2>
            <div class="bg-red-100 rounded-full p-2">
              <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p class="text-sm text-gray-600 mb-3">
            Check for broken links, redirects, crawlability issues, and site structure problems.
          </p>
          <div class="text-lg font-semibold text-gray-900">
            <span v-if="auditResults?.technicalHealth">
              Score: {{ auditResults.technicalHealth.score }} / 100
            </span>
            <span v-else>Score: — / 100 (not yet calculated)</span>
          </div>
          <div v-if="auditResults?.technicalHealth?.findings?.length" class="mt-3 space-y-1">
            <p class="text-xs font-medium text-gray-700">Key Findings:</p>
            <ul class="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li v-for="(finding, idx) in auditResults.technicalHealth.findings.slice(0, 3)" :key="idx">
                {{ finding }}
              </li>
            </ul>
          </div>
        </div>

        <!-- On-Page SEO Card -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold text-gray-900">On-Page SEO</h2>
            <div class="bg-green-100 rounded-full p-2">
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p class="text-sm text-gray-600 mb-3">
            Analyze meta tags, headings, content structure, and keyword optimization.
          </p>
          <div class="text-lg font-semibold text-gray-900">
            <span v-if="auditResults?.onPageSeo">
              Score: {{ auditResults.onPageSeo.score }} / 100
            </span>
            <span v-else>Score: — / 100 (not yet calculated)</span>
          </div>
          <div v-if="auditResults?.onPageSeo?.findings?.length" class="mt-3 space-y-1">
            <p class="text-xs font-medium text-gray-700">Key Findings:</p>
            <ul class="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li v-for="(finding, idx) in auditResults.onPageSeo.findings.slice(0, 3)" :key="idx">
                {{ finding }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Core Web Vitals Card -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold text-gray-900">Core Web Vitals</h2>
            <div class="bg-blue-100 rounded-full p-2">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <p class="text-sm text-gray-600 mb-3">
            Measure LCP, FID, and CLS to understand your site's loading performance.
          </p>
          <div class="text-lg font-semibold text-gray-900">
            <span v-if="auditResults?.coreWebVitals">
              Score: {{ auditResults.coreWebVitals.score }} / 100
            </span>
            <span v-else>Score: — / 100 (not yet calculated)</span>
          </div>
          <div v-if="auditResults?.coreWebVitals?.findings?.length" class="mt-3 space-y-1">
            <p class="text-xs font-medium text-gray-700">Key Findings:</p>
            <ul class="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li v-for="(finding, idx) in auditResults.coreWebVitals.findings.slice(0, 3)" :key="idx">
                {{ finding }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Index Coverage Card -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold text-gray-900">Index Coverage</h2>
            <div class="bg-purple-100 rounded-full p-2">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <p class="text-sm text-gray-600 mb-3">
            Review which pages are indexed, excluded, or have issues in search engines.
          </p>
          <div class="text-lg font-semibold text-gray-900">
            <span v-if="auditResults?.indexCoverage">
              Score: {{ auditResults.indexCoverage.score }} / 100
            </span>
            <span v-else>Score: — / 100 (not yet calculated)</span>
          </div>
          <div v-if="auditResults?.indexCoverage?.findings?.length" class="mt-3 space-y-1">
            <p class="text-xs font-medium text-gray-700">Key Findings:</p>
            <ul class="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li v-for="(finding, idx) in auditResults.indexCoverage.findings.slice(0, 3)" :key="idx">
                {{ finding }}
              </li>
            </ul>
          </div>
        </div>
      </div>


      <!-- Page Issues Breakdown Section -->
      <div v-if="auditResults?.pageIssues?.length" class="mt-6">
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-xl font-bold text-gray-900">Page-Specific Issues</h2>
              <p class="text-sm text-gray-600 mt-1">
                Detailed breakdown of errors found on individual pages
              </p>
            </div>
            <div class="flex items-center space-x-2">
              <button
                @click="selectedCategory = null"
                :class="[
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  selectedCategory === null
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                ]"
              >
                All ({{ auditResults.pageIssues.length }})
              </button>
              <button
                @click="selectedCategory = 'technicalHealth'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  selectedCategory === 'technicalHealth'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                ]"
              >
                Technical ({{ getIssuesByCategory('technicalHealth').length }})
              </button>
              <button
                @click="selectedCategory = 'onPageSeo'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  selectedCategory === 'onPageSeo'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                ]"
              >
                On-Page ({{ getIssuesByCategory('onPageSeo').length }})
              </button>
              <button
                @click="selectedCategory = 'coreWebVitals'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  selectedCategory === 'coreWebVitals'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                ]"
              >
                Performance ({{ getIssuesByCategory('coreWebVitals').length }})
              </button>
              <button
                @click="selectedCategory = 'indexCoverage'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  selectedCategory === 'indexCoverage'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                ]"
              >
                Indexing ({{ getIssuesByCategory('indexCoverage').length }})
              </button>
            </div>
          </div>

          <!-- Issues List -->
          <div class="space-y-4">
            <div
              v-for="(issue, idx) in filteredPageIssues"
              :key="idx"
              class="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-3 mb-2">
                    <a
                      :href="issue.url"
                      target="_blank"
                      class="text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {{ issue.url }}
                    </a>
                    <span
                      :class="[
                        'px-2 py-0.5 rounded text-xs font-medium',
                        getCategoryBadgeClass(issue.category)
                      ]"
                    >
                      {{ getCategoryName(issue.category) }}
                    </span>
                    <span
                      :class="[
                        'px-2 py-0.5 rounded text-xs font-medium',
                        getPriorityBadgeClass(issue.priority)
                      ]"
                    >
                      {{ issue.priority || 'Medium' }}
                    </span>
                  </div>
                  <p class="text-sm font-medium text-gray-900 mb-1">{{ issue.issue }}</p>
                  <p v-if="issue.details" class="text-sm text-gray-600 mb-2">{{ issue.details }}</p>
                  <p v-if="issue.recommendation" class="text-sm text-indigo-700">
                    <span class="font-medium">Fix:</span> {{ issue.recommendation }}
                  </p>
                </div>
                <a
                  :href="issue.url"
                  target="_blank"
                  class="ml-4 text-gray-400 hover:text-indigo-600 transition-colors"
                  title="Open page in new tab"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            <div v-if="filteredPageIssues.length === 0" class="text-center py-8 text-gray-500">
              <p>No issues found in this category.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const route = useRoute()
const nuxtApp = useNuxtApp()

const siteId = computed(() => String(route.params.id || ''))
const $supabase = nuxtApp.$supabase

// Use site integrations composable to fetch integration status
const { ga4Connected, gscConnected } = useSiteIntegrations(siteId)

// Use auth composable for user initials and logout
const { userInitials, fetchUserInitials, handleLogout } = useAuth()

// Audit state
const auditRunning = ref(false)
const auditError = ref<string | null>(null)
const auditResults = ref<any>(null)
const selectedCategory = ref<string | null>(null)
const loadingStoredResults = ref(true)

// Load stored audit results
const loadStoredResults = async () => {
  loadingStoredResults.value = true
  try {
    const response = await fetch(`/api/sites/${siteId.value}/audit/get`, {
      method: 'GET'
    })

    if (response.ok) {
      const data = await response.json()
      if (data.hasAudit && data.audit) {
        auditResults.value = {
          ...data.audit.results,
          auditDate: data.audit.date
        }
      }
    }
  } catch (err) {
    console.error('Error loading stored results:', err)
  } finally {
    loadingStoredResults.value = false
  }
}

// Run audit function (triggers new audit)
const runAudit = async () => {
  auditRunning.value = true
  auditError.value = null
  auditResults.value = null

  try {
    const response = await fetch(`/api/sites/${siteId.value}/audit/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    auditResults.value = data
    
    // Reload stored results
    await loadStoredResults()
  } catch (error: any) {
    console.error('Error running audit:', error)
    auditError.value = error.message || 'Failed to run audit. Please try again.'
  } finally {
    auditRunning.value = false
  }
}

// Format date helper
// Filter page issues by category
const getIssuesByCategory = (category: string) => {
  if (!auditResults.value?.pageIssues) return []
  return auditResults.value.pageIssues.filter((issue: any) => issue.category === category)
}

// Filtered page issues based on selected category
const filteredPageIssues = computed(() => {
  if (!auditResults.value?.pageIssues) return []
  if (selectedCategory.value === null) {
    return auditResults.value.pageIssues
  }
  return auditResults.value.pageIssues.filter((issue: any) => issue.category === selectedCategory.value)
})

// Helper functions for UI
const getCategoryName = (category: string) => {
  const names: Record<string, string> = {
    technicalHealth: 'Technical',
    onPageSeo: 'On-Page SEO',
    coreWebVitals: 'Performance',
    indexCoverage: 'Indexing'
  }
  return names[category] || category
}

const getCategoryBadgeClass = (category: string) => {
  const classes: Record<string, string> = {
    technicalHealth: 'bg-red-100 text-red-700',
    onPageSeo: 'bg-green-100 text-green-700',
    coreWebVitals: 'bg-blue-100 text-blue-700',
    indexCoverage: 'bg-purple-100 text-purple-700'
  }
  return classes[category] || 'bg-gray-100 text-gray-700'
}

const getPriorityBadgeClass = (priority: string) => {
  const classes: Record<string, string> = {
    High: 'bg-red-100 text-red-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-gray-100 text-gray-700'
  }
  return classes[priority] || 'bg-gray-100 text-gray-700'
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(async () => {
  fetchUserInitials()
  await loadStoredResults()
})
</script>

