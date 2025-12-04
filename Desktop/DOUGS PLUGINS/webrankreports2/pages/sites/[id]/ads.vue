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
        <!-- Top Section: Site Info + Connection Status -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div class="flex-1">
              <h1 class="text-2xl font-bold text-gray-900 mb-2">Google Ads</h1>
              <p class="text-gray-600 mb-2">
                <span class="font-medium">{{ site.name }}</span> — {{ site.url }}
              </p>
              <!-- Google Ads Connection Status -->
              <div class="mt-2">
                <div v-if="adsConnected" class="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-green-800">Google Ads: Connected</span>
                </div>
                <div v-else class="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                  <svg class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span class="text-yellow-800">Not connected.</span>
                  <NuxtLink
                    :to="`/sites/${siteId}/settings/integrations#ads`"
                    class="text-yellow-900 font-medium hover:underline"
                  >
                    Connect now →
                  </NuxtLink>
                </div>
              </div>
            </div>
            <!-- Date Range Selector -->
            <div v-if="adsConnected" class="flex items-center gap-2">
              <span class="text-sm text-gray-600 mr-2">Date Range:</span>
              <button
                @click="handleDateRangeChange('LAST_7_DAYS')"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  dateRange === 'LAST_7_DAYS'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                ]"
                :disabled="loading"
              >
                7 Days
              </button>
              <button
                @click="handleDateRangeChange('LAST_30_DAYS')"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  dateRange === 'LAST_30_DAYS'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                ]"
                :disabled="loading"
              >
                30 Days
              </button>
              <button
                @click="handleDateRangeChange('LAST_90_DAYS')"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  dateRange === 'LAST_90_DAYS'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                ]"
                :disabled="loading"
              >
                90 Days
              </button>
            </div>
          </div>
        </div>

        <!-- Not Connected State -->
        <div v-if="!adsConnected" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <svg
            class="mx-auto h-16 w-16 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 class="text-xl font-semibold text-gray-900 mb-2">Google Ads Not Connected</h2>
          <p class="text-gray-600 mb-6">Connect your Google Ads account to view advertising insights.</p>
          <NuxtLink
            :to="`/sites/${siteId}/settings/integrations#ads`"
            class="inline-flex items-center px-6 py-3 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Connect Google Ads
          </NuxtLink>
        </div>

        <!-- Connected Content -->
        <template v-else>
          <!-- Error Message -->
          <div v-if="error" class="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1">
                <p class="text-sm font-medium text-red-800 mb-1">Google Ads data could not be retrieved</p>
                <p class="text-sm text-red-700 mb-2">{{ error }}</p>
                <NuxtLink
                  :to="`/sites/${siteId}/settings/integrations#ads`"
                  class="text-sm text-red-900 font-medium hover:underline"
                >
                  Reconnect Google Ads →
                </NuxtLink>
              </div>
            </div>
          </div>

          <!-- Overview Cards -->
          <div v-if="!loading && totals" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <!-- Impressions -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-600">Impressions</span>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div class="text-2xl font-bold text-gray-900">
                {{ formatNumber(totals.impressions) }}
              </div>
              <p class="text-xs text-gray-500 mt-1">from Google Ads ({{ getDateRangeLabel() }})</p>
            </div>

            <!-- Clicks -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-600">Clicks</span>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <div class="text-2xl font-bold text-gray-900">
                {{ formatNumber(totals.clicks) }}
              </div>
              <p class="text-xs text-gray-500 mt-1">from Google Ads ({{ getDateRangeLabel() }})</p>
            </div>

            <!-- Conversions -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-600">Conversions</span>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="text-2xl font-bold text-gray-900">
                {{ formatNumber(totals.conversions) }}
              </div>
              <p class="text-xs text-gray-500 mt-1">from Google Ads ({{ getDateRangeLabel() }})</p>
            </div>

            <!-- Cost -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-600">Cost</span>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="text-2xl font-bold text-gray-900">
                {{ formatCurrency(totals.costMicros) }}
              </div>
              <p class="text-xs text-gray-500 mt-1">from Google Ads ({{ getDateRangeLabel() }})</p>
            </div>
          </div>

          <!-- Loading Overview Cards -->
          <div v-else-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div v-for="i in 4" :key="i" class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div class="animate-pulse">
                <div class="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                <div class="h-8 bg-gray-200 rounded w-20 mb-2"></div>
                <div class="h-3 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
          </div>

          <!-- Line Chart Section -->
          <div v-if="!loading && totals" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-lg font-semibold text-gray-900">Performance Over Time</h2>
              <!-- Metric Selector -->
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-600">Show:</span>
                <select
                  v-model="chartMetric"
                  class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="impressions">Impressions</option>
                  <option value="clicks">Clicks</option>
                  <option value="cost">Cost</option>
                  <option value="conversions">Conversions</option>
                </select>
              </div>
            </div>
            
            <!-- Chart Placeholder (Time-series data not yet available from API) -->
            <div class="text-center py-12">
              <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p class="text-sm text-gray-500">Time-series chart coming soon. Daily performance breakdown will be available here.</p>
            </div>
          </div>

          <!-- Loading Chart -->
          <div v-else-if="loading" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <div class="animate-pulse">
              <div class="h-4 bg-gray-200 rounded w-48 mb-6"></div>
              <div class="h-80 bg-gray-100 rounded"></div>
            </div>
          </div>

          <!-- Campaigns Table -->
          <div v-if="!loading" class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-900">Campaign Insights</h2>
              <p class="text-sm text-gray-500 mt-1">Performance metrics by campaign</p>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      @click="handleSort('name')"
                    >
                      <div class="flex items-center gap-1">
                        Campaign Name
                        <svg v-if="sortColumn === 'name'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path v-if="sortDirection === 'asc'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </th>
                    <th
                      scope="col"
                      class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      @click="handleSort('impressions')"
                    >
                      <div class="flex items-center justify-end gap-1">
                        Impressions
                        <svg v-if="sortColumn === 'impressions'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path v-if="sortDirection === 'asc'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </th>
                    <th
                      scope="col"
                      class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      @click="handleSort('clicks')"
                    >
                      <div class="flex items-center justify-end gap-1">
                        Clicks
                        <svg v-if="sortColumn === 'clicks'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path v-if="sortDirection === 'asc'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </th>
                    <th
                      scope="col"
                      class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      @click="handleSort('ctr')"
                    >
                      <div class="flex items-center justify-end gap-1">
                        CTR
                        <svg v-if="sortColumn === 'ctr'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path v-if="sortDirection === 'asc'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </th>
                    <th
                      scope="col"
                      class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      @click="handleSort('cpc')"
                    >
                      <div class="flex items-center justify-end gap-1">
                        Avg CPC
                        <svg v-if="sortColumn === 'cpc'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path v-if="sortDirection === 'asc'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </th>
                    <th
                      scope="col"
                      class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      @click="handleSort('cost')"
                    >
                      <div class="flex items-center justify-end gap-1">
                        Cost
                        <svg v-if="sortColumn === 'cost'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path v-if="sortDirection === 'asc'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </th>
                    <th
                      scope="col"
                      class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      @click="handleSort('conversions')"
                    >
                      <div class="flex items-center justify-end gap-1">
                        Conversions
                        <svg v-if="sortColumn === 'conversions'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path v-if="sortDirection === 'asc'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="campaign in sortedCampaigns" :key="campaign.id" class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm font-medium text-gray-900">{{ campaign.name || 'Unnamed Campaign' }}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {{ formatNumber(campaign.impressions) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {{ formatNumber(campaign.clicks) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {{ campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) + '%' : '0%' }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {{ campaign.clicks > 0 ? formatCurrency(campaign.costMicros / campaign.clicks) : '$0.00' }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {{ formatCurrency(campaign.costMicros) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {{ formatNumber(campaign.conversions) }}
                    </td>
                  </tr>
                  <tr v-if="campaigns.length === 0">
                    <td colspan="7" class="px-6 py-8 text-center text-sm text-gray-500">
                      No campaign data available for the selected date range.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Loading Campaigns Table -->
          <div v-else-if="loading" class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="animate-pulse">
                <div class="h-5 bg-gray-200 rounded w-48 mb-2"></div>
                <div class="h-4 bg-gray-200 rounded w-64"></div>
              </div>
            </div>
            <div class="p-6">
              <div class="space-y-3">
                <div v-for="i in 5" :key="i" class="animate-pulse">
                  <div class="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Search Terms Table (Placeholder) -->
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-900">Top Search Terms</h2>
              <p class="text-sm text-gray-500 mt-1">Keywords that triggered your ads</p>
            </div>
            <div class="p-12 text-center">
              <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Search term data not yet available</h3>
              <p class="text-sm text-gray-500">Keyword-level performance data will appear here once available.</p>
            </div>
        </div>

          <!-- Ad Groups Table (Placeholder) -->
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-900">Ad Group Insights</h2>
              <p class="text-sm text-gray-500 mt-1">Performance metrics by ad group</p>
            </div>
            <div class="p-12 text-center">
              <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Ad group data not yet available</h3>
              <p class="text-sm text-gray-500">Ad group-level performance metrics will appear here once available.</p>
        </div>
      </div>

          <!-- Footer Spacing -->
          <div class="h-8"></div>
        </template>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, ref, nextTick } from 'vue'
import { useRoute } from '#imports'
import { useSite } from '~/composables/useSite'
import { useAuth } from '~/composables/useAuth'
import { useSiteIntegrations } from '~/composables/useSiteIntegrations'
import { useGoogleAds, type AdsDateRange, type AdsCampaign } from '~/composables/useGoogleAds'

definePageMeta({
  layout: false
})

const route = useRoute()
const siteId = computed(() => String(route.params.id || '').trim())

const { site, pending: sitePending, error: siteError } = useSite(siteId)
const { userInitials, handleLogout } = useAuth()
const { adsConnected, pending: integrationsPending } = useSiteIntegrations(siteId)

const {
  dateRange,
  totals,
  campaigns,
  loading,
  error,
  fetchSummary,
  formatCurrency,
} = useGoogleAds(siteId)

// Chart metric selector
const chartMetric = ref<'impressions' | 'clicks' | 'cost' | 'conversions'>('impressions')

// Sorting state
const sortColumn = ref<'name' | 'impressions' | 'clicks' | 'ctr' | 'cpc' | 'cost' | 'conversions' | null>('impressions')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Format number helper
const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '—'
  return new Intl.NumberFormat('en-US').format(num)
}

// Get date range label
const getDateRangeLabel = (): string => {
  const labels: Record<AdsDateRange, string> = {
    LAST_7_DAYS: 'Last 7 Days',
    LAST_30_DAYS: 'Last 30 Days',
    LAST_90_DAYS: 'Last 90 Days',
  }
  return labels[dateRange.value] || 'Last 30 Days'
}

// Handle date range change
const handleDateRangeChange = async (newRange: AdsDateRange) => {
  if (!adsConnected.value) {
    return // Don't fetch if not connected
  }
  dateRange.value = newRange
  await fetchSummary()
}

// Sorted campaigns
const sortedCampaigns = computed(() => {
  if (!campaigns.value || campaigns.value.length === 0) return []
  
  const sorted = [...campaigns.value]
  
  if (!sortColumn.value) return sorted
  
  sorted.sort((a, b) => {
    let aValue: number | string
    let bValue: number | string
    
    switch (sortColumn.value) {
      case 'name':
        aValue = (a.name || '').toLowerCase()
        bValue = (b.name || '').toLowerCase()
        break
      case 'impressions':
        aValue = a.impressions || 0
        bValue = b.impressions || 0
        break
      case 'clicks':
        aValue = a.clicks || 0
        bValue = b.clicks || 0
        break
      case 'ctr':
        aValue = a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0
        bValue = b.impressions > 0 ? (b.clicks / b.impressions) * 100 : 0
        break
      case 'cpc':
        aValue = a.clicks > 0 ? a.costMicros / a.clicks : 0
        bValue = b.clicks > 0 ? b.costMicros / b.clicks : 0
        break
      case 'cost':
        aValue = a.costMicros || 0
        bValue = b.costMicros || 0
        break
      case 'conversions':
        aValue = a.conversions || 0
        bValue = b.conversions || 0
        break
      default:
        return 0
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection.value === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }
    
    return sortDirection.value === 'asc'
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number)
  })
  
  return sorted
})

// Handle column sort
const handleSort = (column: typeof sortColumn.value) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'desc'
  }
}

// Fetch data when connected
watch(adsConnected, async (connected) => {
  // Only fetch if explicitly true (not undefined, null, or false)
  if (connected === true) {
    await fetchSummary()
  }
}, { immediate: false })

onMounted(async () => {
  // Wait for integrations to load
  if (integrationsPending.value) {
    await new Promise<void>((resolve) => {
      const unwatch = watch(integrationsPending, (pending) => {
        if (!pending) {
          unwatch()
          resolve()
        }
      }, { immediate: true })
    })
  }
  
  // Only fetch if explicitly connected
  if (adsConnected.value === true) {
    await fetchSummary()
  }
})
</script>
