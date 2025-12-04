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

      <!-- Main Content -->
      <template v-else-if="site">
        <!-- Top Section: Site Info + Date Range -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div class="flex-1">
              <h1 class="text-2xl font-bold text-gray-900 mb-2">Analytics Health</h1>
              <p class="text-gray-600 mb-2">
                <span class="font-medium">{{ site.name }}</span> — {{ site.url }}
              </p>
              <!-- GA4 Connection Status -->
              <div class="mt-2">
                <div v-if="ga4Connected" class="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-green-800">GA4 Connected</span>
                </div>
                <div v-else class="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                  <svg class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span class="text-yellow-800">GA4 not connected.</span>
                  <NuxtLink
                    :to="`/sites/${siteId}/settings/integrations`"
                    class="text-yellow-900 font-medium hover:underline"
                  >
                    Connect now →
                  </NuxtLink>
                </div>
              </div>
            </div>
            <!-- Date Range Selector -->
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600 mr-2">Date Range:</span>
              <button
                @click="selectedRange = 'last_7_days'"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  selectedRange === 'last_7_days'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                ]"
              >
                7 Days
              </button>
              <button
                @click="selectedRange = 'last_28_days'"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  selectedRange === 'last_28_days'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                ]"
              >
                28 Days
              </button>
              <button
                @click="selectedRange = 'last_90_days'"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  selectedRange === 'last_90_days'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                ]"
              >
                90 Days
              </button>
            </div>
          </div>
        </div>

        <!-- Not Connected State -->
        <div v-if="!ga4Connected" class="bg-white rounded-xl border border-yellow-200 shadow-sm p-8 text-center">
          <svg class="w-12 h-12 text-yellow-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">GA4 Not Connected</h3>
          <p class="text-gray-600 mb-4">Connect Google Analytics 4 to compute Analytics Health.</p>
          <NuxtLink
            :to="`/sites/${siteId}/settings/integrations`"
            class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Connect GA4
          </NuxtLink>
        </div>

        <!-- Loading State -->
        <div v-else-if="loading && !current" class="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <p class="text-gray-600">Computing health score...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-white rounded-xl border border-red-200 shadow-sm p-6 mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-red-800 mb-1">Error</h3>
              <p class="text-sm text-red-600">{{ error }}</p>
            </div>
            <button
              @click="handleRecalculate"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        </div>

        <!-- Main Health Content -->
        <template v-else-if="current">
          <!-- Overall Score Card -->
          <div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 shadow-sm p-8 mb-6">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 class="text-3xl font-bold text-gray-900 mb-2">Analytics Health</h2>
                <p class="text-sm text-gray-600">
                  Based on {{ getDateRangeLabel() }} ({{ formatDate(current.period_start) }} - {{ formatDate(current.period_end) }})
                </p>
              </div>
              <div class="text-center md:text-right">
                <div
                  class="text-6xl font-bold mb-2"
                  :class="getScoreColorClass(current.overall_score)"
                >
                  {{ current.overall_score }}
                </div>
                <div class="text-sm font-medium text-gray-600">Overall Score</div>
                <div class="text-xs text-gray-500 mt-1">{{ getScoreLabel(current.overall_score) }}</div>
              </div>
            </div>
          </div>

          <!-- Category Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <!-- Tracking Health -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold text-gray-900">Tracking Health</h3>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="text-3xl font-bold mb-2" :class="getScoreColorClass(current.tracking_score)">
                {{ current.tracking_score }}
              </div>
              <p class="text-xs text-gray-600">{{ getCategoryExplanation('tracking', current.tracking_score) }}</p>
            </div>

            <!-- Traffic Health -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold text-gray-900">Traffic Health</h3>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div class="text-3xl font-bold mb-2" :class="getScoreColorClass(current.traffic_score)">
                {{ current.traffic_score }}
              </div>
              <p class="text-xs text-gray-600">{{ getCategoryExplanation('traffic', current.traffic_score) }}</p>
            </div>

            <!-- Content Health -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold text-gray-900">Content Health</h3>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div class="text-3xl font-bold mb-2" :class="getScoreColorClass(current.content_score)">
                {{ current.content_score }}
              </div>
              <p class="text-xs text-gray-600">{{ getCategoryExplanation('content', current.content_score) }}</p>
            </div>

            <!-- UX / Device Health -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold text-gray-900">UX / Device Health</h3>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="text-3xl font-bold mb-2" :class="getScoreColorClass(current.ux_score)">
                {{ current.ux_score }}
              </div>
              <p class="text-xs text-gray-600">{{ getCategoryExplanation('ux', current.ux_score) }}</p>
            </div>

            <!-- Audience / Geo Health -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold text-gray-900">Audience / Geo Health</h3>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="text-3xl font-bold mb-2" :class="getScoreColorClass(current.audience_score)">
                {{ current.audience_score }}
              </div>
              <p class="text-xs text-gray-600">{{ getCategoryExplanation('audience', current.audience_score) }}</p>
            </div>
          </div>

          <!-- History Mini Chart -->
          <div v-if="history.length > 0" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Health Score Trend</h3>
            <div class="h-48 relative">
              <svg class="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                <!-- Grid lines -->
                <defs>
                  <linearGradient id="healthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#6366f1;stop-opacity:0.3" />
                    <stop offset="100%" style="stop-color:#6366f1;stop-opacity:0.05" />
                  </linearGradient>
                </defs>
                <g v-for="(tick, index) in 5" :key="`grid-${index}`">
                  <line
                    :x1="40"
                    :y1="40 + (index * 40)"
                    :x2="760"
                    :y2="40 + (index * 40)"
                    stroke="#e5e7eb"
                    stroke-width="1"
                    stroke-dasharray="4,4"
                  />
                  <text
                    :x="35"
                    :y="45 + (index * 40)"
                    text-anchor="end"
                    class="text-xs fill-gray-600"
                    font-family="system-ui, -apple-system"
                  >
                    {{ 100 - (index * 25) }}
                  </text>
                </g>
                <!-- Area fill -->
                <path
                  :d="healthAreaPath"
                  fill="url(#healthGradient)"
                />
                <!-- Line -->
                <path
                  :d="healthLinePath"
                  stroke="#6366f1"
                  stroke-width="3"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <!-- Data points -->
                <g v-for="(point, index) in healthChartPoints" :key="`point-${index}`">
                  <circle
                    :cx="point.x"
                    :cy="point.y"
                    r="4"
                    fill="#6366f1"
                  />
                </g>
              </svg>
            </div>
            <div class="mt-4 text-xs text-gray-500 text-center">
              Showing last {{ history.length }} health snapshots
            </div>
          </div>

          <!-- Alerts & Insights -->
          <div class="space-y-6">
            <!-- Critical Alerts -->
            <div v-if="current.critical_alerts && current.critical_alerts.length > 0" class="bg-white rounded-xl border border-red-200 shadow-sm p-6">
              <h3 class="text-lg font-semibold text-red-800 mb-4 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Critical Alerts
              </h3>
              <div class="space-y-3">
                <div
                  v-for="(alert, index) in current.critical_alerts"
                  :key="`alert-${index}`"
                  class="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200"
                >
                  <svg class="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-sm text-red-800">{{ alert.message }}</p>
                </div>
              </div>
            </div>

            <!-- Warnings -->
            <div v-if="current.warnings && current.warnings.length > 0" class="bg-white rounded-xl border border-yellow-200 shadow-sm p-6">
              <h3 class="text-lg font-semibold text-yellow-800 mb-4 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Warnings
              </h3>
              <div class="space-y-3">
                <div
                  v-for="(warning, index) in current.warnings"
                  :key="`warning-${index}`"
                  class="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                >
                  <svg class="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p class="text-sm text-yellow-800">{{ warning.message }}</p>
                </div>
              </div>
            </div>

            <!-- Insights -->
            <div v-if="current.insights && current.insights.length > 0" class="bg-white rounded-xl border border-blue-200 shadow-sm p-6">
              <h3 class="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Insights
              </h3>
              <div class="space-y-3">
                <div
                  v-for="(insight, index) in current.insights"
                  :key="`insight-${index}`"
                  class="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <svg class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-sm text-blue-800">{{ insight.message }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Recalculate Button -->
          <div class="mt-6 flex justify-center">
            <button
              @click="handleRecalculate"
              :disabled="loading"
              class="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed font-medium"
            >
              <svg
                v-if="loading"
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg
                v-else
                class="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {{ loading ? 'Recalculating...' : 'Recalculate Health' }}
            </button>
          </div>
        </template>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { HealthSnapshot } from '~/composables/useAnalyticsHealth'

definePageMeta({
  layout: false
})

const route = useRoute()
const nuxtApp = useNuxtApp()

const siteId = computed(() => String(route.params.id || ''))
const { site, pending: sitePending, error: siteError } = useSite(siteId)
const { integration, ga4Connected } = useSiteIntegrations(siteId)

const {
  current,
  history,
  loading,
  error,
  latestScore,
  loadHistory,
  refreshHealth,
} = useAnalyticsHealth(siteId)

// Use auth composable
const { userInitials, fetchUserInitials, handleLogout } = useAuth()

// Date range state
type DateRangeKey = 'last_7_days' | 'last_28_days' | 'last_90_days'
const selectedRange = ref<DateRangeKey>('last_28_days')

// Calculate date range from selectedRange
const currentDateRange = computed(() => {
  const endDate = new Date()
  const startDate = new Date()
  
  if (selectedRange.value === 'last_7_days') {
    startDate.setDate(startDate.getDate() - 7)
  } else if (selectedRange.value === 'last_28_days') {
    startDate.setDate(startDate.getDate() - 28)
  } else if (selectedRange.value === 'last_90_days') {
    startDate.setDate(startDate.getDate() - 90)
  }
  
  return {
    startDate: formatDateString(startDate),
    endDate: formatDateString(endDate),
  }
})

// Helper to format date as YYYY-MM-DD
function formatDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper: Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Helper: Get date range label
function getDateRangeLabel(): string {
  const labels: Record<DateRangeKey, string> = {
    last_7_days: 'last 7 days',
    last_28_days: 'last 28 days',
    last_90_days: 'last 90 days',
  }
  return labels[selectedRange.value] || 'selected period'
}

// Helper: Get score color class
function getScoreColorClass(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

// Helper: Get score label
function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Needs Improvement'
}

// Helper: Get category explanation
function getCategoryExplanation(category: string, score: number): string {
  if (score >= 80) {
    const explanations: Record<string, string> = {
      tracking: 'Tracking is working well',
      traffic: 'Traffic patterns are healthy',
      content: 'Content distribution is good',
      ux: 'User experience is strong',
      audience: 'Audience reach is good',
    }
    return explanations[category] || 'Score is good'
  } else if (score >= 60) {
    return 'Could be improved'
  } else {
    return 'Needs attention'
  }
}

// Handle recalculate
const handleRecalculate = async () => {
  try {
    await refreshHealth(currentDateRange.value)
  } catch (err: any) {
    console.error('Error recalculating health:', err)
  }
}

// Watch date range changes
watch(selectedRange, async () => {
  if (ga4Connected.value) {
    await refreshHealth(currentDateRange.value)
  }
})

// Health chart calculations
const healthChartPoints = computed(() => {
  if (!history.value || history.value.length === 0) return []
  
  const maxScore = 100
  const minScore = 0
  const chartWidth = 720
  const chartHeight = 120
  const padding = 40
  
  return history.value.map((point, index) => {
    const x = padding + (index / (history.value.length - 1 || 1)) * chartWidth
    const normalizedScore = (point.overall_score - minScore) / (maxScore - minScore)
    const y = padding + chartHeight - (normalizedScore * chartHeight)
    
    return { x, y, score: point.overall_score }
  })
})

const healthLinePath = computed(() => {
  if (healthChartPoints.value.length === 0) return ''
  
  const points = healthChartPoints.value
  let path = `M ${points[0].x} ${points[0].y}`
  
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`
  }
  
  return path
})

const healthAreaPath = computed(() => {
  if (healthChartPoints.value.length === 0) return ''
  
  const line = healthLinePath.value
  const firstPoint = healthChartPoints.value[0]
  const lastPoint = healthChartPoints.value[healthChartPoints.value.length - 1]
  const bottomY = 160 // chartHeight + padding
  
  return `${line} L ${lastPoint.x} ${bottomY} L ${firstPoint.x} ${bottomY} Z`
})

// Initialize
onMounted(async () => {
  fetchUserInitials()
  
  if (ga4Connected.value) {
    await loadHistory()
    
    if (!current.value) {
      await refreshHealth(currentDateRange.value)
    }
  }
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

