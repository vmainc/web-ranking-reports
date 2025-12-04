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
              <h1 class="text-2xl font-bold text-gray-900 mb-2">Search Console</h1>
              <p class="text-gray-600 mb-2">
                <span class="font-medium">{{ site.name }}</span> — {{ site.url }}
              </p>
              <!-- GSC Connection Status -->
              <div class="mt-2">
                <div v-if="gscConnected" class="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-green-800">Search Console Connected</span>
                </div>
                <div v-else class="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                  <svg class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span class="text-yellow-800">Search Console not connected.</span>
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
        <div v-if="!gscConnected" class="bg-white rounded-xl border border-yellow-200 shadow-sm p-8 text-center">
          <svg class="w-12 h-12 text-yellow-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Search Console Not Connected</h3>
          <p class="text-gray-600 mb-4">Connect Google Search Console to view search performance data.</p>
          <NuxtLink
            :to="`/sites/${siteId}/settings/integrations`"
            class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Connect Search Console
          </NuxtLink>
        </div>

        <!-- Main Content When Connected -->
        <template v-else>
          <!-- Error Message -->
          <div v-if="error" class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p class="text-sm font-medium text-red-800">{{ error }}</p>
          </div>

          <!-- Overview Cards -->
          <div v-if="overview && overview.rows.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <!-- Total Clicks -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-600">Total Clicks</span>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <div class="text-2xl font-bold text-gray-900">
                {{ formatNumber(totalClicks) }}
              </div>
              <p class="text-xs text-gray-500 mt-1">{{ getDateRangeLabel() }}</p>
            </div>

            <!-- Total Impressions -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-600">Total Impressions</span>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div class="text-2xl font-bold text-gray-900">
                {{ formatNumber(totalImpressions) }}
              </div>
              <p class="text-xs text-gray-500 mt-1">{{ getDateRangeLabel() }}</p>
            </div>

            <!-- Average CTR -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-600">Average CTR</span>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div class="text-2xl font-bold text-gray-900">
                {{ formatPercent(averageCtr) }}
              </div>
              <p class="text-xs text-gray-500 mt-1">{{ getDateRangeLabel() }}</p>
            </div>

            <!-- Average Position -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-600">Average Position</span>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <div class="text-2xl font-bold text-gray-900">
                {{ formatPosition(averagePosition) }}
              </div>
              <p class="text-xs text-gray-500 mt-1">{{ getDateRangeLabel() }}</p>
            </div>
          </div>

          <!-- Loading Overview -->
          <div v-else-if="loading && !overview" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div v-for="i in 4" :key="i" class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div class="animate-pulse">
                <div class="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                <div class="h-8 bg-gray-200 rounded w-20 mb-2"></div>
                <div class="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>

          <!-- Line Chart Section -->
          <div v-if="overview && sortedOverviewRows.length > 0" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-lg font-semibold text-gray-900">Clicks Over Time</h2>
            </div>
            
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
                  <linearGradient id="gscChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#6366f1;stop-opacity:0.3" />
                    <stop offset="100%" style="stop-color:#6366f1;stop-opacity:0.05" />
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
                  fill="url(#gscChartGradient)"
                />
                
                <!-- Line -->
                <path
                  :d="linePath"
                  fill="none"
                  stroke="#6366f1"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                
                <!-- Data points -->
                <g v-for="(point, index) in chartData" :key="`point-${index}`">
                  <circle
                    :cx="point.x"
                    :cy="point.y"
                    r="4"
                    fill="#6366f1"
                    stroke="#ffffff"
                    stroke-width="2"
                    class="hover:r-6 transition-all"
                  />
                </g>
                
                <!-- X-axis labels -->
                <g v-for="(label, index) in xAxisLabels" :key="`xlabel-${index}`">
                  <text
                    :x="label.x"
                    :y="chartHeight - chartPadding + 20"
                    text-anchor="middle"
                    class="text-xs fill-gray-600"
                    font-family="system-ui"
                  >
                    {{ formatDateLabel(label.label) }}
                  </text>
                </g>
                
                <!-- Y-axis labels -->
                <g v-for="(tick, index) in yAxisTicks" :key="`ylabel-${index}`">
                  <text
                    :x="chartPadding - 10"
                    :y="chartPadding + (index * yAxisSpacing) + 4"
                    text-anchor="end"
                    class="text-xs fill-gray-600"
                    font-family="system-ui"
                  >
                    {{ formatNumber(tick) }}
                  </text>
                </g>
                
                <!-- Hover tooltip -->
                <g v-if="hoveredPoint">
                  <line
                    :x1="hoveredPoint.x"
                    :y1="chartPadding"
                    :x2="hoveredPoint.x"
                    :y2="chartHeight - chartPadding"
                    stroke="#6366f1"
                    stroke-width="1"
                    stroke-dasharray="2,2"
                    opacity="0.5"
                  />
                  <circle
                    :cx="hoveredPoint.x"
                    :cy="hoveredPoint.y"
                    r="6"
                    fill="#6366f1"
                    stroke="#ffffff"
                    stroke-width="2"
                  />
                  <rect
                    :x="hoveredPoint.x - 60"
                    :y="hoveredPoint.y - 50"
                    width="120"
                    height="40"
                    rx="4"
                    fill="#1f2937"
                    opacity="0.9"
                  />
                  <text
                    :x="hoveredPoint.x"
                    :y="hoveredPoint.y - 30"
                    text-anchor="middle"
                    class="text-xs fill-white font-medium"
                    font-family="system-ui"
                  >
                    {{ formatDateLabel(hoveredPoint.date) }}
                  </text>
                  <text
                    :x="hoveredPoint.x"
                    :y="hoveredPoint.y - 15"
                    text-anchor="middle"
                    class="text-xs fill-white"
                    font-family="system-ui"
                  >
                    {{ formatNumber(hoveredPoint.value) }} clicks
                  </text>
                </g>
              </svg>
            </div>
          </div>

          <!-- Tabs Section -->
          <div v-if="gscConnected" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div class="mb-4">
              <div class="border-b border-gray-200">
                <nav class="-mb-px flex space-x-8">
                  <button
                    @click="activeTab = 'queries'"
                    :class="[
                      'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                      activeTab === 'queries'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    ]"
                  >
                    Queries
                  </button>
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
                    @click="activeTab = 'countries'"
                    :class="[
                      'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                      activeTab === 'countries'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    ]"
                  >
                    Countries
                  </button>
                  <button
                    @click="activeTab = 'devices'"
                    :class="[
                      'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                      activeTab === 'devices'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    ]"
                  >
                    Devices
                  </button>
                </nav>
              </div>
            </div>

            <!-- Queries Tab -->
            <div v-if="activeTab === 'queries'">
              <div v-if="loading && !queries" class="text-center py-8">
                <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
                <p class="text-sm text-gray-600">Loading queries data...</p>
              </div>
              <div v-else-if="error && !queries" class="text-center py-8">
                <p class="text-sm text-red-600">{{ error }}</p>
              </div>
              <div v-else-if="queries && queries.rows.length > 0" class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Query
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clicks
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Impressions
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CTR
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr
                      v-for="(row, index) in queries.rows"
                      :key="`query-${index}`"
                      class="hover:bg-gray-50"
                    >
                      <td class="px-4 py-3 text-sm font-medium text-gray-900">
                        {{ row.keys[0] || '(not set)' }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {{ formatNumber(row.clicks) }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {{ formatNumber(row.impressions) }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {{ formatPercent(row.ctr) }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {{ formatPosition(row.position) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="text-center py-8">
                <p class="text-sm text-gray-500">No queries data available.</p>
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
                        Page
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clicks
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Impressions
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CTR
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr
                      v-for="(row, index) in pages.rows"
                      :key="`page-${index}`"
                      class="hover:bg-gray-50"
                    >
                      <td class="px-4 py-3 text-sm font-medium text-gray-900">
                        {{ row.keys[0] || '(not set)' }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {{ formatNumber(row.clicks) }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {{ formatNumber(row.impressions) }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {{ formatPercent(row.ctr) }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {{ formatPosition(row.position) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="text-center py-8">
                <p class="text-sm text-gray-500">No pages data available.</p>
              </div>
            </div>

            <!-- Countries Tab -->
            <div v-if="activeTab === 'countries'">
              <div v-if="loading && !countries" class="text-center py-8">
                <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
                <p class="text-sm text-gray-600">Loading countries data...</p>
              </div>
              <div v-else-if="error && !countries" class="text-center py-8">
                <p class="text-sm text-red-600">{{ error }}</p>
              </div>
              <div v-else-if="countries && countries.rows.length > 0" class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Country
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clicks
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Impressions
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CTR
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr
                      v-for="(row, index) in countries.rows"
                      :key="`country-${index}`"
                      class="hover:bg-gray-50"
                    >
                      <td class="px-4 py-3 text-sm font-medium text-gray-900">
                        {{ row.keys[0] || '(not set)' }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {{ formatNumber(row.clicks) }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {{ formatNumber(row.impressions) }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {{ formatPercent(row.ctr) }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {{ formatPosition(row.position) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="text-center py-8">
                <p class="text-sm text-gray-500">No countries data available.</p>
              </div>
            </div>

            <!-- Devices Tab -->
            <div v-if="activeTab === 'devices'">
              <div v-if="loading && !devices" class="text-center py-8">
                <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
                <p class="text-sm text-gray-600">Loading devices data...</p>
              </div>
              <div v-else-if="error && !devices" class="text-center py-8">
                <p class="text-sm text-red-600">{{ error }}</p>
              </div>
              <div v-else-if="devices && devices.rows.length > 0" class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Device
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clicks
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Impressions
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CTR
                      </th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr
                      v-for="(row, index) in devices.rows"
                      :key="`device-${index}`"
                      class="hover:bg-gray-50"
                    >
                      <td class="px-4 py-3 text-sm font-medium text-gray-900">
                        {{ row.keys[0] || '(not set)' }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {{ formatNumber(row.clicks) }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {{ formatNumber(row.impressions) }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {{ formatPercent(row.ctr) }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {{ formatPosition(row.position) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="text-center py-8">
                <p class="text-sm text-gray-500">No devices data available.</p>
              </div>
            </div>
          </div>
        </template>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute } from '#imports'
import { useSite } from '~/composables/useSite'
import { useSiteIntegrations } from '~/composables/useSiteIntegrations'
import { useSearchConsole, type DateRange } from '~/composables/useSearchConsole'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: false
})

const route = useRoute()
const siteId = computed(() => String(route.params.id || ''))

const { site, pending: sitePending, error: siteError } = useSite(siteId)
const { integration, gscConnected } = useSiteIntegrations(siteId)
const {
  overview,
  queries,
  pages,
  countries,
  devices,
  loading,
  error,
  totalClicks,
  totalImpressions,
  averageCtr,
  averagePosition,
  fetchOverview,
  fetchQueries,
  fetchPages,
  fetchCountries,
  fetchDevices,
} = useSearchConsole(siteId)

const { userInitials, fetchUserInitials, handleLogout } = useAuth()

type DateRangeKey = 'last_7_days' | 'last_28_days' | 'last_90_days'
const selectedRange = ref<DateRangeKey>('last_28_days')

type GscTab = 'queries' | 'pages' | 'countries' | 'devices'
const activeTab = ref<GscTab>('queries')

const formatDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const currentDateRange = computed<DateRange>(() => {
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

const getDateRangeLabel = () => {
  const labels: Record<DateRangeKey, string> = {
    last_7_days: 'Last 7 days',
    last_28_days: 'Last 28 days',
    last_90_days: 'Last 90 days',
  }
  return labels[selectedRange.value]
}

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(Math.round(num))
}

const formatPercent = (value: number): string => {
  return `${value.toFixed(2)}%`
}

const formatPosition = (value: number): string => {
  return value.toFixed(1)
}

const formatDateLabel = (dateStr: string): string => {
  if (!dateStr || dateStr.length !== 10) return dateStr
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const sortedOverviewRows = computed(() => {
  if (!overview.value || overview.value.rows.length === 0) return []
  return [...overview.value.rows].sort((a, b) => {
    const dateA = a.keys[0] || ''
    const dateB = b.keys[0] || ''
    return dateA.localeCompare(dateB)
  })
})

const chartWidth = 800
const chartHeight = 260
const chartPadding = 50

const chartData = computed(() => {
  if (sortedOverviewRows.value.length === 0) return []

  const values = sortedOverviewRows.value.map(row => row.clicks)
  const maxValue = Math.max(...values, 1)

  return sortedOverviewRows.value.map((row, index) => {
    const value = row.clicks
    const normalized = value / maxValue

    const x = chartPadding + (index / (sortedOverviewRows.value.length - 1 || 1)) * (chartWidth - chartPadding * 2)
    const y = chartHeight - chartPadding - normalized * (chartHeight - chartPadding * 2)

    const dateKey = row.keys[0] || ''
    return {
      x,
      y,
      value,
      date: dateKey,
    }
  })
})

const linePath = computed(() => {
  if (chartData.value.length === 0) return ''
  const points = chartData.value
  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpX = (prev.x + curr.x) / 2
    path += ` Q ${cpX} ${prev.y}, ${curr.x} ${curr.y}`
  }
  return path
})

const areaPath = computed(() => {
  if (chartData.value.length === 0) return ''
  const points = chartData.value
  const first = points[0]
  const last = points[points.length - 1]
  const bottomY = chartHeight - chartPadding
  return `${linePath.value} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`
})

const xAxisLabels = computed(() => {
  if (chartData.value.length === 0) return []
  const step = Math.max(1, Math.floor(chartData.value.length / 7))
  return chartData.value
    .filter((_, index) => index % step === 0 || index === chartData.value.length - 1)
    .map(point => {
      const dateStr = point.date
      if (dateStr && dateStr.length === 10) {
        return {
          x: point.x,
          label: dateStr,
        }
      }
      return {
        x: point.x,
        label: point.date,
      }
    })
})

const yAxisTicks = computed(() => {
  if (chartData.value.length === 0) return []
  const values = chartData.value.map(d => d.value)
  const maxValue = Math.max(...values, 1)
  const tickCount = 5
  const ticks: number[] = []
  for (let i = 0; i <= tickCount; i++) {
    ticks.push((maxValue / tickCount) * i)
  }
  return ticks
})

const yAxisSpacing = computed(() => {
  return (chartHeight - chartPadding * 2) / (yAxisTicks.value.length - 1 || 1)
})

const hoveredPoint = ref<{ x: number; y: number; date: string; value: number } | null>(null)

const handleChartHover = (event: MouseEvent) => {
  if (chartData.value.length === 0) return

  const container = event.currentTarget as HTMLElement
  const rect = container.getBoundingClientRect()
  const containerWidth = rect.width
  const containerHeight = rect.height

  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  const viewX = (mouseX / containerWidth) * chartWidth
  const viewY = (mouseY / containerHeight) * chartHeight

  let closest = chartData.value[0]
  let minDist = Math.abs(viewX - closest.x)

  for (const point of chartData.value) {
    const dist = Math.abs(viewX - point.x)
    if (dist < minDist) {
      minDist = dist
      closest = point
    }
  }

  hoveredPoint.value = {
    x: (closest.x / chartWidth) * containerWidth,
    y: (closest.y / chartHeight) * containerHeight,
    date: closest.date,
    value: closest.value,
  }
}

const handleChartLeave = () => {
  hoveredPoint.value = null
}

const loadAllForRange = async () => {
  await fetchOverview(currentDateRange.value)
  await fetchQueries(currentDateRange.value)
  await fetchPages(currentDateRange.value)
  await fetchCountries(currentDateRange.value)
  await fetchDevices(currentDateRange.value)
}

watch(selectedRange, async () => {
  if (gscConnected.value) {
    await loadAllForRange()
  }
})

watch(activeTab, async () => {
  if (!gscConnected.value) return

  if (activeTab.value === 'queries' && !queries.value) {
    await fetchQueries(currentDateRange.value)
  } else if (activeTab.value === 'pages' && !pages.value) {
    await fetchPages(currentDateRange.value)
  } else if (activeTab.value === 'countries' && !countries.value) {
    await fetchCountries(currentDateRange.value)
  } else if (activeTab.value === 'devices' && !devices.value) {
    await fetchDevices(currentDateRange.value)
  }
})

onMounted(async () => {
  fetchUserInitials()
  if (gscConnected.value) {
    await loadAllForRange()
  }
})
</script>

