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
              <h1 class="text-2xl font-bold text-gray-900 mb-2">Analytics</h1>
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

        <!-- Error Message -->
        <div v-if="error && !ga4Connected" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p class="text-sm font-medium text-red-800">{{ error }}</p>
        </div>

        <!-- Overview Cards -->
        <div v-if="ga4Connected && overview" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <!-- Total Users -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-600">Total Users</span>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div class="text-2xl font-bold text-gray-900">
              {{ formatNumber(getTotalMetric(overview, 'totalUsers')) }}
            </div>
            <p class="text-xs text-gray-500 mt-1">{{ getDateRangeLabel() }}</p>
          </div>

          <!-- New Users -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-600">New Users</span>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div class="text-2xl font-bold text-gray-900">
              {{ formatNumber(getTotalMetric(overview, 'newUsers')) }}
            </div>
            <p class="text-xs text-gray-500 mt-1">{{ getDateRangeLabel() }}</p>
          </div>

          <!-- Sessions -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-600">Sessions</span>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div class="text-2xl font-bold text-gray-900">
              {{ formatNumber(getTotalMetric(overview, 'sessions')) }}
            </div>
            <p class="text-xs text-gray-500 mt-1">{{ getDateRangeLabel() }}</p>
          </div>

          <!-- Page Views -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-600">Page Views</span>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div class="text-2xl font-bold text-gray-900">
              {{ formatNumber(getTotalMetric(overview, 'screenPageViews')) }}
            </div>
            <p class="text-xs text-gray-500 mt-1">{{ getDateRangeLabel() }}</p>
          </div>
        </div>

        <!-- Loading Overview -->
        <div v-else-if="ga4Connected && loading && !overview" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div v-for="i in 4" :key="i" class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div class="animate-pulse">
              <div class="h-4 bg-gray-200 rounded w-24 mb-3"></div>
              <div class="h-8 bg-gray-200 rounded w-20 mb-2"></div>
              <div class="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        </div>

        <!-- Time Series Chart Section -->
        <div v-if="ga4Connected && overview" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold text-gray-900">Traffic Over Time</h2>
            <!-- Metric Selector -->
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600">Show:</span>
              <select
                v-model="chartMetric"
                class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="sessions">Sessions</option>
                <option value="totalUsers">Users</option>
                <option value="newUsers">New Users</option>
                <option value="screenPageViews">Page Views</option>
              </select>
            </div>
          </div>
          
          <!-- Beautiful Line Chart -->
          <div v-if="sortedOverviewRows.length > 0" class="relative">
            <!-- Chart Container -->
            <div 
              class="relative h-80 w-full cursor-crosshair"
              @mousemove="handleChartHover"
              @mouseleave="handleChartLeave"
            >
              <svg
                :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
                class="w-full h-full"
                preserveAspectRatio="none"
              >
                <!-- Grid Lines -->
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" :style="`stop-color:${chartColors[chartMetric]};stop-opacity:0.3`" />
                    <stop offset="100%" :style="`stop-color:${chartColors[chartMetric]};stop-opacity:0.05`" />
                  </linearGradient>
                </defs>
                
                <!-- Y-axis grid lines -->
                <g v-for="(tick, index) in yAxisTicks" :key="`grid-${index}`">
                  <line
                    :x1="chartPadding"
                    :y1="chartPadding + (index * yAxisSpacing)"
                    :x2="chartWidth - chartPadding"
                    :y2="chartPadding + (index * yAxisSpacing)"
                    stroke="#e5e7eb"
                    stroke-width="1"
                    stroke-dasharray="4,4"
                  />
                </g>
                
                <!-- Area fill under line -->
                <path
                  :d="areaPath"
                  fill="url(#chartGradient)"
                />
                
                <!-- Main line -->
                <path
                  :d="linePath"
                  :stroke="chartColors[chartMetric]"
                  stroke-width="3"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                
                <!-- Data points -->
                <g v-for="(point, index) in chartPoints" :key="`point-${index}`">
                  <circle
                    :cx="point.x"
                    :cy="point.y"
                    r="5"
                    :fill="chartColors[chartMetric]"
                    class="hover:r-7 transition-all cursor-pointer"
                  />
                  <circle
                    :cx="point.x"
                    :cy="point.y"
                    r="8"
                    :fill="chartColors[chartMetric]"
                    fill-opacity="0.2"
                    class="hover:r-12 transition-all"
                  />
                </g>
                
                <!-- X-axis labels -->
                <g v-for="(point, index) in xAxisLabels" :key="`xlabel-${index}`">
                  <text
                    :x="point.x"
                    :y="chartHeight - chartPadding + 20"
                    text-anchor="middle"
                    class="text-xs fill-gray-600"
                    font-family="system-ui, -apple-system"
                  >
                    {{ point.label }}
                  </text>
                </g>
                
                <!-- Y-axis labels -->
                <g v-for="(tick, index) in yAxisTicks" :key="`ylabel-${index}`">
                  <text
                    :x="chartPadding - 10"
                    :y="chartPadding + (index * yAxisSpacing) + 4"
                    text-anchor="end"
                    class="text-xs fill-gray-600"
                    font-family="system-ui, -apple-system"
                  >
                    {{ formatCompactNumber(tick) }}
                  </text>
                </g>
              </svg>
              
              <!-- Hover tooltip -->
              <div
                v-if="hoveredPoint"
                class="absolute bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none z-10 whitespace-nowrap"
                :style="{
                  left: `${hoveredPoint.x}px`,
                  top: `${hoveredPoint.y}px`,
                  transform: 'translate(-50%, -100%)',
                  marginTop: '-10px'
                }"
              >
                <div class="font-semibold mb-1">{{ hoveredPoint.date }}</div>
                <div class="flex items-center gap-2">
                  <span
                    class="w-2 h-2 rounded-full"
                    :style="{ backgroundColor: chartColors[chartMetric] }"
                  ></span>
                  <span>{{ formatNumber(hoveredPoint.value) }} {{ getMetricLabel(chartMetric) }}</span>
                </div>
              </div>
            </div>
            
            <!-- Legend -->
            <div class="mt-4 flex items-center justify-center gap-6">
              <div class="flex items-center gap-2">
                <div
                  class="w-3 h-3 rounded-full"
                  :style="{ backgroundColor: chartColors[chartMetric] }"
                ></div>
                <span class="text-sm text-gray-600">{{ getMetricLabel(chartMetric) }}</span>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-12">
            <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p class="text-sm text-gray-500">No data available for this date range.</p>
          </div>
        </div>

        <!-- Drilldown Section with Tabs -->
        <div v-if="ga4Connected" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div class="mb-4">
            <div class="border-b border-gray-200">
              <nav class="-mb-px flex space-x-8">
                <button
                  @click="activeTab = 'pages'"
                  :class="[
                    'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                    activeTab === 'pages'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  ]"
                >
                  Pages
                </button>
                <button
                  @click="activeTab = 'geo'"
                  :class="[
                    'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                    activeTab === 'geo'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  ]"
                >
                  Geography
                </button>
                <button
                  @click="activeTab = 'tech'"
                  :class="[
                    'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                    activeTab === 'tech'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  ]"
                >
                  Technology
                </button>
                <button
                  @click="activeTab = 'acquisition'"
                  :class="[
                    'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                    activeTab === 'acquisition'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  ]"
                >
                  Acquisition
                </button>
                <button
                  @click="activeTab = 'audience'"
                  :class="[
                    'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                    activeTab === 'audience'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  ]"
                >
                  Audience
                </button>
              </nav>
            </div>
          </div>

          <!-- Pages Tab -->
          <div v-if="activeTab === 'pages'">
            <div v-if="loading && !pages" class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
              <p class="text-sm text-gray-600">Loading pages data...</p>
            </div>
            <div v-else-if="error && !pages" class="text-center py-8">
              <p class="text-sm text-red-600">{{ error }}</p>
            </div>
            <div v-else-if="pages && pages.rows.length > 0" class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Page Path
                    </th>
                    <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                    <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sessions
                    </th>
                    <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Page Views
                    </th>
                    <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Engaged Sessions
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr
                    v-for="row in pages.rows"
                    :key="row.dimensionValues.pagePath"
                    class="hover:bg-gray-50 cursor-pointer"
                    @click="openDetail('pagePath', row.dimensionValues.pagePath)"
                  >
                    <td class="px-4 py-3 text-sm font-medium text-gray-900">
                      {{ row.dimensionValues.pagePath || '(not set)' }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {{ formatNumber(row.metricValues.totalUsers || 0) }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {{ formatNumber(row.metricValues.sessions || 0) }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {{ formatNumber(row.metricValues.screenPageViews || 0) }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {{ formatNumber(row.metricValues.engagedSessions || 0) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="text-center py-8">
              <p class="text-sm text-gray-500">No pages data available.</p>
            </div>
          </div>

          <!-- Geography Tab -->
          <div v-if="activeTab === 'geo'">
            <div v-if="loading && !geo" class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
              <p class="text-sm text-gray-600">Loading geography data...</p>
            </div>
            <div v-else-if="error && !geo" class="text-center py-8">
              <p class="text-sm text-red-600">{{ error }}</p>
            </div>
            <div v-else-if="geo && geo.rows.length > 0" class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Country
                    </th>
                    <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      City
                    </th>
                    <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                    <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sessions
                    </th>
                    <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Page Views
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr
                    v-for="(row, index) in geo.rows"
                    :key="`${row.dimensionValues.country}-${row.dimensionValues.city}-${index}`"
                    class="hover:bg-gray-50 cursor-pointer"
                    @click="openDetail('country', row.dimensionValues.country)"
                  >
                    <td class="px-4 py-3 text-sm font-medium text-gray-900">
                      {{ row.dimensionValues.country || '(not set)' }}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                      {{ row.dimensionValues.city || '(not set)' }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {{ formatNumber(row.metricValues.totalUsers || 0) }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {{ formatNumber(row.metricValues.sessions || 0) }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {{ formatNumber(row.metricValues.screenPageViews || 0) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="text-center py-8">
              <p class="text-sm text-gray-500">No geography data available.</p>
            </div>
          </div>

          <!-- Technology Tab -->
          <div v-if="activeTab === 'tech'">
            <div v-if="loading && !tech" class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
              <p class="text-sm text-gray-600">Loading technology data...</p>
            </div>
            <div v-else-if="error && !tech" class="text-center py-8">
              <p class="text-sm text-red-600">{{ error }}</p>
            </div>
            <div v-else-if="tech && tech.rows.length > 0" class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Device Category
                    </th>
                    <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operating System
                    </th>
                    <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Browser
                    </th>
                    <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                    <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sessions
                    </th>
                    <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Page Views
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="(row, index) in tech.rows" :key="`${row.dimensionValues.deviceCategory}-${row.dimensionValues.operatingSystem}-${row.dimensionValues.browser}-${index}`" class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-sm font-medium text-gray-900">
                      {{ row.dimensionValues.deviceCategory || '(not set)' }}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                      {{ row.dimensionValues.operatingSystem || '(not set)' }}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                      {{ row.dimensionValues.browser || '(not set)' }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {{ formatNumber(row.metricValues.totalUsers || 0) }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {{ formatNumber(row.metricValues.sessions || 0) }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {{ formatNumber(row.metricValues.screenPageViews || 0) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="text-center py-8">
              <p class="text-sm text-gray-500">No technology data available.</p>
            </div>
          </div>

          <!-- Acquisition Tab -->
          <div v-if="activeTab === 'acquisition'">
            <div v-if="loading && !acquisition" class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
              <p class="text-sm text-gray-600">Loading acquisition data...</p>
            </div>
            <div v-else-if="error && !acquisition" class="text-center py-8">
              <p class="text-sm text-red-600">{{ error }}</p>
            </div>
            <div v-else-if="acquisition && acquisition.rows.length > 0" class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Channel Group
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source / Medium
                    </th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sessions
                    </th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Engaged Sessions
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr
                    v-for="(row, index) in acquisition.rows"
                    :key="`${row.dimensionValues.sessionDefaultChannelGroup}-${row.dimensionValues.sourceMedium}-${index}`"
                    class="hover:bg-gray-50 cursor-pointer"
                    @click="openDetail('sessionDefaultChannelGroup', row.dimensionValues.sessionDefaultChannelGroup)"
                  >
                    <td class="px-4 py-3 text-sm font-medium text-gray-900">
                      {{ row.dimensionValues.sessionDefaultChannelGroup || '(not set)' }}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                      {{ row.dimensionValues.sourceMedium || '(not set)' }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {{ formatNumber(row.metricValues.totalUsers || 0) }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {{ formatNumber(row.metricValues.sessions || 0) }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {{ formatNumber(row.metricValues.engagedSessions || 0) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="text-center py-8">
              <p class="text-sm text-gray-500">No acquisition data available.</p>
            </div>
          </div>

          <!-- Audience Tab -->
          <div v-if="activeTab === 'audience'">
            <div v-if="loading && !demographics" class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
              <p class="text-sm text-gray-600">Loading audience data...</p>
            </div>
            <div v-else-if="error && !demographics" class="text-center py-8">
              <p class="text-sm text-red-600">{{ error }}</p>
            </div>
            <div v-else-if="demographics && demographics.rows.length > 0" class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Country
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gender
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Age
                    </th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sessions
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr
                    v-for="(row, index) in demographics.rows"
                    :key="`${row.dimensionValues.country}-${row.dimensionValues.userGender}-${row.dimensionValues.userAgeBracket}-${index}`"
                    class="hover:bg-gray-50"
                  >
                    <td class="px-4 py-3 text-sm font-medium text-gray-900">
                      {{ row.dimensionValues.country || '(not set)' }}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                      {{ row.dimensionValues.userGender || '(not set)' }}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                      {{ row.dimensionValues.userAgeBracket || '(not set)' }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {{ formatNumber(row.metricValues.totalUsers || 0) }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {{ formatNumber(row.metricValues.sessions || 0) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="text-center py-8">
              <p class="text-sm text-gray-500">No audience data available. Demographics may not be enabled in GA4.</p>
            </div>
          </div>
        </div>

        <!-- Not Connected State -->
        <div v-else class="bg-white rounded-xl border border-yellow-200 shadow-sm p-8 text-center">
          <svg class="w-12 h-12 text-yellow-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">GA4 Not Connected</h3>
          <p class="text-gray-600 mb-4">Connect Google Analytics 4 to view analytics data for this site.</p>
          <NuxtLink
            :to="`/sites/${siteId}/settings/integrations`"
            class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Connect GA4
          </NuxtLink>
        </div>

        <!-- Detail Slide-over -->
        <transition name="fade">
          <div
            v-if="detailOpen"
            class="fixed inset-0 bg-black bg-opacity-30 flex justify-end z-40"
            @click.self="detailOpen = false"
          >
            <div class="w-full max-w-md bg-white h-full shadow-xl flex flex-col">
              <div class="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-900">
                  {{ detailTitle || 'Detail' }}
                </h3>
                <button
                  type="button"
                  class="text-gray-400 hover:text-gray-600"
                  @click="detailOpen = false"
                >
                  <span class="sr-only">Close</span>
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div class="flex-1 overflow-y-auto p-4">
                <div v-if="loading && !detailReport" class="text-center py-8">
                  <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
                  <p class="text-sm text-gray-600">Loading detail data...</p>
                </div>
                <div v-else-if="detailReport && detailReport.rows.length > 0">
                  <p class="text-sm text-gray-500 mb-2">
                    {{ getDateRangeLabel() }} — daily metrics
                  </p>
                  <table class="min-w-full divide-y divide-gray-200 text-sm">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Users
                        </th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sessions
                        </th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Page Views
                        </th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      <tr v-for="(row, index) in detailReport.rows" :key="index">
                        <td class="px-3 py-2 text-gray-900">
                          {{ formatDate(row.dimensionValues.date) }}
                        </td>
                        <td class="px-3 py-2 text-right text-gray-900">
                          {{ formatNumber(row.metricValues.totalUsers || 0) }}
                        </td>
                        <td class="px-3 py-2 text-right text-gray-900">
                          {{ formatNumber(row.metricValues.sessions || 0) }}
                        </td>
                        <td class="px-3 py-2 text-right text-gray-900">
                          {{ formatNumber(row.metricValues.screenPageViews || 0) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="text-center py-8">
                  <p class="text-sm text-gray-500">No detail data available for this selection.</p>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { NormalizedReport, DateRange } from '~/composables/useAnalytics'

definePageMeta({
  layout: false
})

const route = useRoute()
const nuxtApp = useNuxtApp()

const siteId = computed(() => String(route.params.id || ''))
const { site, pending: sitePending, error: siteError } = useSite(siteId)
const { integration, ga4Connected } = useSiteIntegrations(siteId)

const {
  overview,
  pages,
  geo,
  tech,
  acquisition,
  demographics,
  detailReport,
  loading,
  error,
  fetchOverview,
  fetchPages,
  fetchGeo,
  fetchTech,
  fetchAcquisition,
  fetchDemographics,
  fetchDetail,
} = useAnalytics(siteId)

// Use auth composable
const { userInitials, fetchUserInitials, handleLogout } = useAuth()

// Date range state
type DateRangeKey = 'last_7_days' | 'last_28_days' | 'last_90_days'
const selectedRange = ref<DateRangeKey>('last_28_days')

// Calculate date range from selectedRange
const currentDateRange = computed((): DateRange => {
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

// Tab state for drilldowns
type AnalyticsTab = 'pages' | 'geo' | 'tech' | 'acquisition' | 'audience'
const activeTab = ref<AnalyticsTab>('pages')

// Detail panel state
const detailOpen = ref(false)
const detailTitle = ref('')
const detailDimension = ref<'pagePath' | 'country' | 'sessionDefaultChannelGroup' | null>(null)
const detailValue = ref<string | null>(null)

// Chart state
const chartMetric = ref<'sessions' | 'totalUsers' | 'newUsers' | 'screenPageViews'>('sessions')
const hoveredPoint = ref<{ x: number; y: number; date: string; value: number } | null>(null)

// Chart colors
const chartColors = {
  sessions: '#6366f1', // indigo
  totalUsers: '#10b981', // emerald
  newUsers: '#f59e0b', // amber
  screenPageViews: '#8b5cf6', // violet
}

// Chart dimensions
const chartWidth = 800
const chartHeight = 300
const chartPadding = 60

// Watch for date range changes and reload data
watch([selectedRange, ga4Connected], async () => {
  if (!ga4Connected.value) return

  await fetchOverview(currentDateRange.value)

  if (activeTab.value === 'pages') {
    await fetchPages(currentDateRange.value)
  } else if (activeTab.value === 'geo') {
    await fetchGeo(currentDateRange.value)
  } else if (activeTab.value === 'tech') {
    await fetchTech(currentDateRange.value)
  } else if (activeTab.value === 'acquisition') {
    await fetchAcquisition(currentDateRange.value)
  } else if (activeTab.value === 'audience') {
    await fetchDemographics(currentDateRange.value)
  }
})

// Watch for tab changes and load data if needed
watch(activeTab, async (newTab) => {
  if (!ga4Connected.value) return
  
  if (newTab === 'pages' && !pages.value) {
    await fetchPages(currentDateRange.value)
  } else if (newTab === 'geo' && !geo.value) {
    await fetchGeo(currentDateRange.value)
  } else if (newTab === 'tech' && !tech.value) {
    await fetchTech(currentDateRange.value)
  } else if (newTab === 'acquisition' && !acquisition.value) {
    await fetchAcquisition(currentDateRange.value)
  } else if (newTab === 'audience' && !demographics.value) {
    await fetchDemographics(currentDateRange.value)
  }
})

// Helper: Get total metric from overview
function getTotalMetric(report: NormalizedReport | null, metricName: string): number {
  if (!report || !report.rows) return 0
  return report.rows.reduce((sum, row) => {
    return sum + (row.metricValues[metricName] || 0)
  }, 0)
}

// Helper: Format numbers with commas
function formatNumber(num: number): string {
  if (num === 0 || !num) return '0'
  return new Intl.NumberFormat('en-US').format(Math.round(num))
}

// Helper: Format date for display (from YYYYMMDD to readable format)
function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr
  const year = dateStr.substring(0, 4)
  const month = dateStr.substring(4, 6)
  const day = dateStr.substring(6, 8)
  return `${year}-${month}-${day}`
}

// Helper: Get date range label
function getDateRangeLabel(): string {
  const labels: Record<DateRangeKey, string> = {
    last_7_days: 'Last 7 days',
    last_28_days: 'Last 28 days',
    last_90_days: 'Last 90 days',
  }
  return labels[selectedRange.value] || 'Selected period'
}

// Computed: Sort overview rows by date
const sortedOverviewRows = computed(() => {
  if (!overview.value || !overview.value.rows) return []
  return [...overview.value.rows].sort((a, b) => {
    const dateA = a.dimensionValues.date || ''
    const dateB = b.dimensionValues.date || ''
    return dateA.localeCompare(dateB)
  })
})

// Helper: Get metric label for dimension
function getMetricLabelForDimension(dimension: string): string {
  const labels: Record<string, string> = {
    pagePath: 'Page',
    country: 'Country',
    sessionDefaultChannelGroup: 'Channel Group',
  }
  return labels[dimension] || dimension
}

// Open detail panel
const openDetail = async (
  dimension: 'pagePath' | 'country' | 'sessionDefaultChannelGroup',
  value: string | undefined
) => {
  if (!value) return

  detailDimension.value = dimension
  detailValue.value = value
  detailTitle.value = `${getMetricLabelForDimension(dimension)}: ${value}`
  detailOpen.value = true

  await fetchDetail(dimension, value, currentDateRange.value)
}

// Chart calculations
const chartData = computed(() => {
  if (!sortedOverviewRows.value || sortedOverviewRows.value.length === 0) return []
  
  const values = sortedOverviewRows.value.map(row => 
    row.metricValues[chartMetric.value] || 0
  )
  const maxValue = Math.max(...values, 1)
  const minValue = Math.min(...values, 0)
  
  return sortedOverviewRows.value.map((row, index) => {
    const value = row.metricValues[chartMetric.value] || 0
    const normalizedValue = maxValue > minValue 
      ? ((value - minValue) / (maxValue - minValue))
      : 0.5
    
    const x = chartPadding + (index / (sortedOverviewRows.value.length - 1 || 1)) * (chartWidth - chartPadding * 2)
    const y = chartHeight - chartPadding - (normalizedValue * (chartHeight - chartPadding * 2))
    
    return {
      x,
      y,
      value,
      date: formatDate(row.dimensionValues.date),
      rawDate: row.dimensionValues.date,
    }
  })
})

// Chart points for rendering
const chartPoints = computed(() => chartData.value)

// Y-axis ticks
const yAxisTicks = computed(() => {
  if (chartData.value.length === 0) return []
  const values = chartData.value.map(d => d.value)
  const maxValue = Math.max(...values, 1)
  const tickCount = 5
  const ticks = []
  
  for (let i = 0; i <= tickCount; i++) {
    ticks.push((maxValue / tickCount) * i)
  }
  
  return ticks
})

const yAxisSpacing = computed(() => {
  return (chartHeight - chartPadding * 2) / (yAxisTicks.value.length - 1 || 1)
})

// X-axis labels (show every nth label to avoid crowding)
const xAxisLabels = computed(() => {
  if (chartData.value.length === 0) return []
  const step = Math.max(1, Math.floor(chartData.value.length / 7)) // Show ~7 labels
  return chartData.value
    .filter((_, index) => index % step === 0 || index === chartData.value.length - 1)
    .map(point => ({
      x: point.x,
      label: formatShortDate(point.rawDate),
    }))
})

// Line path for the chart
const linePath = computed(() => {
  if (chartData.value.length === 0) return ''
  
  const points = chartData.value
  let path = `M ${points[0].x} ${points[0].y}`
  
  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1]
    const currPoint = points[i]
    
    // Use smooth curves (quadratic bezier)
    const cpX = (prevPoint.x + currPoint.x) / 2
    path += ` Q ${cpX} ${prevPoint.y}, ${currPoint.x} ${currPoint.y}`
  }
  
  return path
})

// Area path (for gradient fill)
const areaPath = computed(() => {
  if (chartData.value.length === 0) return ''
  
  const line = linePath.value
  const firstPoint = chartData.value[0]
  const lastPoint = chartData.value[chartData.value.length - 1]
  const bottomY = chartHeight - chartPadding
  
  return `${line} L ${lastPoint.x} ${bottomY} L ${firstPoint.x} ${bottomY} Z`
})

// Helper: Format short date (MM/DD)
function formatShortDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr
  const month = dateStr.substring(4, 6)
  const day = dateStr.substring(6, 8)
  return `${month}/${day}`
}

// Helper: Format compact number (1.2K, 1.5M, etc.)
function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return Math.round(num).toString()
}

// Helper: Get metric label
function getMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    sessions: 'Sessions',
    totalUsers: 'Users',
    newUsers: 'New Users',
    screenPageViews: 'Page Views',
  }
  return labels[metric] || metric
}

// Handle chart hover
const handleChartHover = (event: MouseEvent) => {
  if (!chartData.value.length) return
  
  const container = event.currentTarget as HTMLElement
  const rect = container.getBoundingClientRect()
  const svg = container.querySelector('svg')
  if (!svg) return
  
  // Calculate mouse position relative to SVG viewBox
  const containerWidth = rect.width
  const containerHeight = rect.height
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top
  
  // Convert to viewBox coordinates
  const viewBoxX = (mouseX / containerWidth) * chartWidth
  const viewBoxY = (mouseY / containerHeight) * chartHeight
  
  // Find closest point
  let closestPoint = chartData.value[0]
  let minDistance = Math.abs(viewBoxX - closestPoint.x)
  
  for (const point of chartData.value) {
    const distance = Math.abs(viewBoxX - point.x)
    if (distance < minDistance) {
      minDistance = distance
      closestPoint = point
    }
  }
  
  // Convert back to container coordinates for tooltip positioning
  hoveredPoint.value = {
    x: (closestPoint.x / chartWidth) * containerWidth,
    y: (closestPoint.y / chartHeight) * containerHeight,
    date: closestPoint.date,
    value: closestPoint.value,
  }
}

const handleChartLeave = () => {
  hoveredPoint.value = null
}

// Initialize data on mount
onMounted(async () => {
  fetchUserInitials()
  
  if (ga4Connected.value) {
    await fetchOverview(currentDateRange.value)
    await fetchPages(currentDateRange.value)
  }
})

// FUTURE EXTENSIONS:
// 
// 1. Events / Conversions:
//    - Add 'events' report type to ga4-report Edge Function
//    - Add fetchEvents() to useAnalytics composable
//    - Add "Events" tab to analytics.vue showing event counts and conversions
//
// 2. Landing Pages:
//    - Add 'landingPages' report type with landingPage dimension
//    - Show top landing pages with bounce rate and session metrics
//    - Add filter for entry vs exit pages
//
// 3. Source/Medium:
//    - Add 'sourceMedium' report type
//    - Show traffic sources (organic, direct, referral, social, paid)
//    - Add "Acquisition" tab with source/medium breakdown
//
// 4. Demographics:
//    - Add 'demographics' report type (requires GA4 property to have demographics enabled)
//    - Show age brackets and gender distribution
//    - Add "Audience" tab with demographic insights
//
// 5. Additional Visualizations:
//    - Replace time-series table with chart library (Chart.js, Recharts, etc.)
//    - Add pie charts for device categories, countries
//    - Add bar charts for top pages, sources
//
// 6. Sub-pages:
//    - Create /analytics/traffic for detailed traffic analysis
//    - Create /analytics/content for page performance
//    - Create /analytics/audience for demographic data
//
// 7. Filters and Comparisons:
//    - Add date range comparison (compare to previous period)
//    - Add segment filters (new vs returning users, device type, etc.)
//    - Add custom date range picker
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

