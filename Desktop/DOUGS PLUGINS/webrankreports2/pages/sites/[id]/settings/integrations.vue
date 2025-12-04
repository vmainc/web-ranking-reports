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
      <div v-if="sitePending || integrationsPending" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div class="flex items-center justify-center py-8">
          <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
            <p class="text-gray-600">Loading integration settings...</p>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="integrationsError" class="bg-white rounded-2xl border border-red-200 shadow-sm p-6 mb-6">
        <div class="flex items-center justify-center py-8">
          <div class="text-center">
            <div class="text-red-600 mb-4">
              <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Error Loading Settings</h3>
            <p class="text-gray-600 mb-4">{{ integrationsError.message || 'Failed to load integration settings' }}</p>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <template v-else-if="site">
        <!-- Site Info Card -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ site.name }}</h1>
          <a
            :href="site.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-gray-600 hover:text-indigo-600 transition-colors mb-4 inline-block"
          >
            {{ site.url }}
          </a>
          
          <!-- Unified Google Connection Status -->
          <div class="mt-4 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-gray-900 mb-1">Google Integration</h3>
                <p class="text-xs text-gray-600">
                  <span v-if="ga4Connected || gscConnected || adsConnected" class="text-green-700">
                    Connected to Google Services
                  </span>
                  <span v-else class="text-gray-600">
                    Not connected. Connect once to enable GA4, Search Console, and Ads.
                  </span>
                </p>
              </div>
              <div>
                <button
                  v-if="ga4Connected && gscConnected && adsConnected"
                  type="button"
                  @click="connectGoogle"
                  :disabled="connectingGoogle"
                  class="inline-flex items-center px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <svg v-if="!connectingGoogle" class="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span v-if="connectingGoogle">Reconnecting...</span>
                  <span v-else>Reconnect Google</span>
                </button>
                <button
                  v-else
                  type="button"
                  @click="connectGoogle"
                  :disabled="connectingGoogle"
                  class="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <svg v-if="!connectingGoogle" class="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span v-if="connectingGoogle">Connecting...</span>
                  <span v-else>Connect Google</span>
                </button>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 mt-4">
            <span
              :class="[
                'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
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
            </span>
            <span
              :class="[
                'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
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
            </span>
            <span
              :class="[
                'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
                adsConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              ]"
            >
              <span
                class="w-1.5 h-1.5 rounded-full mr-2"
                :class="adsConnected ? 'bg-emerald-500' : 'bg-gray-400'"
              ></span>
              Ads: {{ adsConnected ? 'Connected' : 'Not Connected' }}
            </span>
          </div>
        </div>

        <!-- Status Messages -->
        <div v-if="saveMessage || connectMessage" class="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm font-medium text-green-800">{{ saveMessage || connectMessage }}</p>
          </div>
        </div>

        <div v-if="saveError || connectError" class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm font-medium text-red-800">{{ saveError || connectError }}</p>
          </div>
        </div>

        <!-- Integration Cards -->
        <div class="grid gap-6 md:grid-cols-3">
          <!-- GA4 Card -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-900">Google Analytics 4</h2>
              <span
                :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  ga4Connected
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-100 text-gray-600'
                ]"
              >
                {{ ga4Connected ? 'Connected' : 'Not Connected' }}
              </span>
            </div>
            <p class="text-sm text-gray-600 mb-4">
              Connect your GA4 property to track website traffic and user behavior.
            </p>
            
            <!-- OAuth Connect Button -->
            <div v-if="!ga4Connected" class="mb-4">
              <button
                @click="connectGa4OAuth"
                :disabled="connectingGa4"
                class="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium"
              >
                <svg v-if="!connectingGa4" class="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span v-if="connectingGa4">Connecting...</span>
                <span v-else>Connect with Google</span>
              </button>
              <p class="text-xs text-gray-500 mt-2 text-center">
                One-click OAuth connection. Requires OAuth setup in Supabase.
              </p>
            </div>
            
            <!-- Manual Token Entry (Collapsible) -->
            <details class="mb-4">
              <summary class="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-700 mb-2">
                Manually Add Tokens
              </summary>
              <div class="mt-3 space-y-3 pt-3 border-t border-gray-200">
                <div>
                  <label for="ga4-access-token" class="block text-xs font-medium text-gray-700 mb-1">
                    Access Token
                  </label>
                  <input
                    id="ga4-access-token"
                    v-model="ga4AccessToken"
                    type="password"
                    placeholder="ya29.xxx..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label for="ga4-refresh-token" class="block text-xs font-medium text-gray-700 mb-1">
                    Refresh Token (optional)
                  </label>
                  <input
                    id="ga4-refresh-token"
                    v-model="ga4RefreshToken"
                    type="password"
                    placeholder="1//xxx..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                  />
                </div>
                <button
                  @click="saveGa4Tokens"
                  :disabled="savingGa4Tokens"
                  class="w-full bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-xs font-medium"
                >
                  <span v-if="savingGa4Tokens">Saving...</span>
                  <span v-else>Save Tokens</span>
                </button>
              </div>
            </details>

            <div class="space-y-4">
              <div>
                <label for="ga4-property-id" class="block text-sm font-medium text-gray-700 mb-1">
                  Property ID
                </label>
                <input
                  id="ga4-property-id"
                  v-model="ga4PropertyId"
                  type="text"
                  placeholder="G-XXXXXXXXXX"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label for="ga4-measurement-id" class="block text-sm font-medium text-gray-700 mb-1">
                  Measurement ID
                </label>
                <input
                  id="ga4-measurement-id"
                  v-model="ga4MeasurementId"
                  type="text"
                  placeholder="G-XXXXXXXXXX"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <button
                @click="saveGa4"
                :disabled="savingGa4"
                class="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium"
              >
                <span v-if="savingGa4">Saving...</span>
                <span v-else>Save GA4 Settings</span>
              </button>
            </div>
          </div>

          <!-- Google Search Console Card -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-900">Google Search Console</h2>
              <span
                :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  gscConnected
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-100 text-gray-600'
                ]"
              >
                {{ gscConnected ? 'Connected' : 'Not Connected' }}
              </span>
            </div>
            <p class="text-sm text-gray-600 mb-4">
              Connect your Search Console property to monitor search performance and rankings.
            </p>
            
            <!-- Manual Token Entry (Collapsible) -->
            <details class="mb-4">
              <summary class="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-700 mb-2">
                Manually Add Tokens
              </summary>
              <div class="mt-3 space-y-3 pt-3 border-t border-gray-200">
                <div>
                  <label for="gsc-access-token" class="block text-xs font-medium text-gray-700 mb-1">
                    Access Token
                  </label>
                  <input
                    id="gsc-access-token"
                    v-model="gscAccessToken"
                    type="password"
                    placeholder="ya29.xxx..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label for="gsc-refresh-token" class="block text-xs font-medium text-gray-700 mb-1">
                    Refresh Token (optional)
                  </label>
                  <input
                    id="gsc-refresh-token"
                    v-model="gscRefreshToken"
                    type="password"
                    placeholder="1//xxx..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                  />
                </div>
                <button
                  @click="saveGscTokens"
                  :disabled="savingGscTokens"
                  class="w-full bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-xs font-medium"
                >
                  <span v-if="savingGscTokens">Saving...</span>
                  <span v-else>Save Tokens</span>
                </button>
              </div>
            </details>

            <div class="space-y-4">
              <div>
                <label for="gsc-property-url" class="block text-sm font-medium text-gray-700 mb-1">
                  Property URL
                </label>
                <input
                  id="gsc-property-url"
                  v-model="gscPropertyUrl"
                  type="text"
                  placeholder="https://example.com"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <button
                @click="saveGsc"
                :disabled="savingGsc"
                class="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium"
              >
                <span v-if="savingGsc">Saving...</span>
                <span v-else>Save Search Console Settings</span>
              </button>
            </div>
          </div>

          <!-- Google Ads Card -->
          <div id="ads" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-900">Google Ads</h2>
              <span
                :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  adsConnected
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-100 text-gray-600'
                ]"
              >
                {{ adsConnected ? 'Google Ads Connected' : 'Not connected' }}
              </span>
            </div>
            <p class="text-sm text-gray-600 mb-4">
              Connect your Google Ads account to track campaign performance.
            </p>
            
            <!-- OAuth Connect Button -->
            <div v-if="!adsConnected" class="mb-4">
              <button
                type="button"
                class="w-full inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                :disabled="startingAdsOAuth || savingAds"
                @click="startGoogleAdsOAuth"
              >
                <svg v-if="!startingAdsOAuth" class="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span v-if="!startingAdsOAuth">Connect Google Ads</span>
                <span v-else>Redirecting...</span>
              </button>
            </div>
            
            <!-- Manual Token Entry (Collapsible) -->
            <details class="mb-4">
              <summary class="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-700 mb-2">
                Manually Add Tokens
              </summary>
              <div class="mt-3 space-y-3 pt-3 border-t border-gray-200">
                <div>
                  <label for="ads-access-token" class="block text-xs font-medium text-gray-700 mb-1">
                    Access Token
                  </label>
                  <input
                    id="ads-access-token"
                    v-model="adsAccessToken"
                    type="password"
                    placeholder="ya29.xxx..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label for="ads-refresh-token" class="block text-xs font-medium text-gray-700 mb-1">
                    Refresh Token (optional)
                  </label>
                  <input
                    id="ads-refresh-token"
                    v-model="adsRefreshToken"
                    type="password"
                    placeholder="1//xxx..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                  />
                </div>
                <button
                  @click="saveAdsTokens"
                  :disabled="savingAdsTokens"
                  class="w-full bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-xs font-medium"
                >
                  <span v-if="savingAdsTokens">Saving...</span>
                  <span v-else>Save Tokens</span>
                </button>
              </div>
            </details>

            <div class="space-y-4">
              <div>
                <label for="ads-customer-id" class="block text-sm font-medium text-gray-700 mb-1">
                  Customer ID
                </label>
                <input
                  id="ads-customer-id"
                  v-model="adsCustomerId"
                  type="text"
                  placeholder="123-456-7890"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <button
                @click="saveAds"
                :disabled="savingAds"
                class="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium"
              >
                <span v-if="savingAds">Saving...</span>
                <span v-else>Save Ads Settings</span>
              </button>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const route = useRoute()
const router = useRouter()
const nuxtApp = useNuxtApp()
const $supabase = nuxtApp.$supabase

const siteId = computed(() => String(route.params.id || ''))
const config = useRuntimeConfig()
const connectingGa4 = ref(false)
const connectingGoogle = ref(false)
const startingAdsOAuth = ref(false)
const connectMessage = ref<string | null>(null)
const connectError = ref<string | null>(null)

const { site, pending: sitePending } = useSite(siteId)
const {
  integration,
  ga4Connected,
  gscConnected,
  adsConnected,
  pending: integrationsPending,
  error: integrationsError,
  refresh: refreshIntegrations
} = useSiteIntegrations(siteId)

// Form fields for IDs
const ga4PropertyId = ref('')
const ga4MeasurementId = ref('')
const gscPropertyUrl = ref('')
const adsCustomerId = ref('')

// Form fields for tokens
const ga4AccessToken = ref('')
const ga4RefreshToken = ref('')
const gscAccessToken = ref('')
const gscRefreshToken = ref('')
const adsAccessToken = ref('')
const adsRefreshToken = ref('')

// Initialize when integration loads
watch(
  () => integration.value,
  (value) => {
    if (!value) return
    // IDs
    ga4PropertyId.value = value.ga4_property_id || ''
    ga4MeasurementId.value = value.ga4_measurement_id || ''
    gscPropertyUrl.value = value.gsc_property_url || ''
    adsCustomerId.value = value.ads_customer_id || ''
    // Tokens - Note: tokens are typically not fetched in frontend for security, but we show empty fields for manual entry
    // If you need to show existing tokens, you'd fetch them server-side
    ga4AccessToken.value = ''
    ga4RefreshToken.value = ''
    gscAccessToken.value = ''
    gscRefreshToken.value = ''
    adsAccessToken.value = ''
    adsRefreshToken.value = ''
  },
  { immediate: true }
)

// Saving states
const savingGa4 = ref(false)
const savingGsc = ref(false)
const savingAds = ref(false)
const savingGa4Tokens = ref(false)
const savingGscTokens = ref(false)
const savingAdsTokens = ref(false)
const saveMessage = ref<string | null>(null)
const saveError = ref<string | null>(null)

// Helper to ensure a site_integrations row exists
const ensureIntegrationRow = async () => {
  if (!integration.value) {
    const { error } = await $supabase
      .from('site_integrations')
      .insert({
        site_id: siteId.value
      })
      .select()
      .single()

    if (error) throw error
    await refreshIntegrations()
  }
}

// Save GA4 settings
const saveGa4 = async () => {
  savingGa4.value = true
  saveMessage.value = null
  saveError.value = null
  try {
    await ensureIntegrationRow()
    const { error } = await $supabase
      .from('site_integrations')
      .update({
        ga4_property_id: ga4PropertyId.value || null,
        ga4_measurement_id: ga4MeasurementId.value || null,
        ga4_connected: !!(ga4PropertyId.value && ga4MeasurementId.value),
        updated_at: new Date().toISOString()
      })
      .eq('site_id', siteId.value)

    if (error) throw error
    await refreshIntegrations()
    saveMessage.value = 'GA4 settings saved.'
    
    // Clear message after 5 seconds
    setTimeout(() => {
      saveMessage.value = null
    }, 5000)
  } catch (err: any) {
    console.error(err)
    saveError.value = 'Could not save GA4 settings.'
    
    // Clear error after 5 seconds
    setTimeout(() => {
      saveError.value = null
    }, 5000)
  } finally {
    savingGa4.value = false
  }
}

// Save Search Console settings
const saveGsc = async () => {
  savingGsc.value = true
  saveMessage.value = null
  saveError.value = null
  try {
    await ensureIntegrationRow()
    const { error } = await $supabase
      .from('site_integrations')
      .update({
        gsc_property_url: gscPropertyUrl.value || null,
        gsc_connected: !!gscPropertyUrl.value,
        updated_at: new Date().toISOString()
      })
      .eq('site_id', siteId.value)

    if (error) throw error
    await refreshIntegrations()
    saveMessage.value = 'Search Console settings saved.'
    
    // Clear message after 5 seconds
    setTimeout(() => {
      saveMessage.value = null
    }, 5000)
  } catch (err: any) {
    console.error(err)
    saveError.value = 'Could not save Search Console settings.'
    
    // Clear error after 5 seconds
    setTimeout(() => {
      saveError.value = null
    }, 5000)
  } finally {
    savingGsc.value = false
  }
}

// Save Google Ads settings
const saveAds = async () => {
  savingAds.value = true
  saveMessage.value = null
  saveError.value = null
  try {
    await ensureIntegrationRow()
    const { error } = await $supabase
      .from('site_integrations')
      .update({
        ads_customer_id: adsCustomerId.value || null,
        ads_connected: !!adsCustomerId.value,
        updated_at: new Date().toISOString()
      })
      .eq('site_id', siteId.value)

    if (error) throw error
    await refreshIntegrations()
    saveMessage.value = 'Google Ads settings saved.'
    
    // Clear message after 5 seconds
    setTimeout(() => {
      saveMessage.value = null
    }, 5000)
  } catch (err: any) {
    console.error(err)
    saveError.value = 'Could not save Google Ads settings.'
    
    // Clear error after 5 seconds
    setTimeout(() => {
      saveError.value = null
    }, 5000)
  } finally {
    savingAds.value = false
  }
}

// Save GA4 tokens
const saveGa4Tokens = async () => {
  savingGa4Tokens.value = true
  saveMessage.value = null
  saveError.value = null
  try {
    await ensureIntegrationRow()
    
    // Calculate expiration (typically access tokens expire in 1 hour, but adjust as needed)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    
    const { error } = await $supabase
      .from('site_integrations')
      .update({
        ga4_access_token: ga4AccessToken.value || null,
        ga4_refresh_token: ga4RefreshToken.value || null,
        ga4_token_expires_at: ga4AccessToken.value ? expiresAt : null,
        ga4_connected: !!ga4AccessToken.value,
        updated_at: new Date().toISOString()
      })
      .eq('site_id', siteId.value)

    if (error) throw error
    await refreshIntegrations()
    
    // Clear token fields after save
    ga4AccessToken.value = ''
    ga4RefreshToken.value = ''
    
    saveMessage.value = 'GA4 tokens saved.'
    setTimeout(() => {
      saveMessage.value = null
    }, 5000)
  } catch (err: any) {
    console.error(err)
    saveError.value = 'Could not save GA4 tokens.'
    setTimeout(() => {
      saveError.value = null
    }, 5000)
  } finally {
    savingGa4Tokens.value = false
  }
}

// Save Search Console tokens
const saveGscTokens = async () => {
  savingGscTokens.value = true
  saveMessage.value = null
  saveError.value = null
  try {
    await ensureIntegrationRow()
    
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    
    const { error } = await $supabase
      .from('site_integrations')
      .update({
        gsc_access_token: gscAccessToken.value || null,
        gsc_refresh_token: gscRefreshToken.value || null,
        gsc_token_expires_at: gscAccessToken.value ? expiresAt : null,
        gsc_connected: !!gscAccessToken.value,
        updated_at: new Date().toISOString()
      })
      .eq('site_id', siteId.value)

    if (error) throw error
    await refreshIntegrations()
    
    // Clear token fields after save
    gscAccessToken.value = ''
    gscRefreshToken.value = ''
    
    saveMessage.value = 'Search Console tokens saved.'
    setTimeout(() => {
      saveMessage.value = null
    }, 5000)
  } catch (err: any) {
    console.error(err)
    saveError.value = 'Could not save Search Console tokens.'
    setTimeout(() => {
      saveError.value = null
    }, 5000)
  } finally {
    savingGscTokens.value = false
  }
}

// Save Google Ads tokens
const saveAdsTokens = async () => {
  savingAdsTokens.value = true
  saveMessage.value = null
  saveError.value = null
  try {
    await ensureIntegrationRow()
    
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    
    const { error } = await $supabase
      .from('site_integrations')
      .update({
        ads_access_token: adsAccessToken.value || null,
        ads_refresh_token: adsRefreshToken.value || null,
        ads_token_expires_at: adsAccessToken.value ? expiresAt : null,
        ads_connected: !!adsAccessToken.value,
        updated_at: new Date().toISOString()
      })
      .eq('site_id', siteId.value)

    if (error) throw error
    await refreshIntegrations()
    
    // Clear token fields after save
    adsAccessToken.value = ''
    adsRefreshToken.value = ''
    
    saveMessage.value = 'Google Ads tokens saved.'
    setTimeout(() => {
      saveMessage.value = null
    }, 5000)
  } catch (err: any) {
    console.error(err)
    saveError.value = 'Could not save Google Ads tokens.'
    setTimeout(() => {
      saveError.value = null
    }, 5000)
  } finally {
    savingAdsTokens.value = false
  }
}

// Unified Google OAuth connection
// Connects all Google services (GA4, GSC, Ads) with a single OAuth flow
const connectGoogle = async () => {
  connectingGoogle.value = true
  connectMessage.value = null
  connectError.value = null

  try {
    // Get functions base URL from config
    const functionsBaseUrl = config.public.supabaseFunctionsUrl || 
      (config.public.supabaseUrl 
        ? config.public.supabaseUrl.replace('.supabase.co', '.functions.supabase.co')
        : '')

    if (!functionsBaseUrl) {
      throw new Error('Supabase Functions URL not configured')
    }

    // Build redirect URL to return to after OAuth
    const appUrl = config.public.appUrl || window.location.origin
    const redirectTo = `${appUrl}/sites/${siteId.value}/settings/integrations`

    // Build OAuth start URL
    const url = new URL(`${functionsBaseUrl}/google-oauth-start`)
    url.searchParams.set('site_id', siteId.value)
    url.searchParams.set('redirect_to', redirectTo)

    // Redirect browser to OAuth flow
    window.location.href = url.toString()
  } catch (err: any) {
    console.error('Error starting Google OAuth:', err)
    connectError.value = 'Could not start Google connection. Please try again.'
    connectingGoogle.value = false
    setTimeout(() => {
      connectError.value = null
    }, 5000)
  }
}

// Connect Google Ads via OAuth
const startGoogleAdsOAuth = async () => {
  if (!siteId.value) return
  startingAdsOAuth.value = true
  saveError.value = null

  try {
    const functionsBaseUrl = config.public.supabaseFunctionsUrl as string
    const anonKey = config.public.supabaseAnonKey as string

    if (!functionsBaseUrl) {
      throw new Error('Supabase Functions URL not configured')
    }

    // Get session token for authentication
    const { data: { session } } = await $supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Not authenticated. Please log in and try again.')
    }

    const response = await fetch(`${functionsBaseUrl}/google-ads-start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ site_id: siteId.value })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('google-ads-start failed:', errorData)
      saveError.value = 'Could not start Google Ads connection.'
      return
    }

    const data = await response.json() as { authUrl?: string }

    if (!data.authUrl) {
      saveError.value = 'No authorization URL returned from Google Ads start function.'
      return
    }

    // Redirect browser to Google OAuth consent screen
    window.location.href = data.authUrl
  } catch (err: any) {
    console.error('Error starting Google Ads OAuth:', err)
    saveError.value = err.message || 'Could not start Google Ads connection.'
    startingAdsOAuth.value = false
  }
}

// Connect GA4 via OAuth (legacy - kept for backward compatibility)
const connectGa4OAuth = () => {
  connectingGa4.value = true
  
  // Build the OAuth start URL
  // The Supabase functions URL format: https://<project>.supabase.co/functions/v1/<function-name>
  // Note: Supabase Edge Functions gateway validates JWTs automatically when auth headers are present
  // Since the anon key format (sb_publishable__...) isn't a JWT, we pass it only in the URL
  // The Edge Function itself validates the site_id for security
  const supabaseUrl = config.public.supabaseUrl
  const functionsUrl = supabaseUrl.replace(/\.co$/, '.co/functions/v1')
  const oauthUrl = `${functionsUrl}/google-ga4-start?site_id=${siteId.value}`
  
  // Direct redirect - no auth headers to avoid JWT validation issues
  // The Edge Function will still work because site_id validation is sufficient
  window.location.href = oauthUrl
}

// Use auth composable for user initials and logout
const { userInitials, fetchUserInitials, handleLogout } = useAuth()

onMounted(() => {
  fetchUserInitials()
  
  // Check if we just came back from a successful OAuth flow
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('ads') === 'connected') {
    saveMessage.value = 'Google Ads successfully connected.'
    refreshIntegrations()
    // Clean up URL
    const newUrl = window.location.pathname
    window.history.replaceState({}, '', newUrl)
    setTimeout(() => {
      saveMessage.value = null
    }, 5000)
  }
  
  // Google Ads OAuth success
  if (route.query.ads === 'connected') {
    saveMessage.value = 'Google Ads successfully connected.'
    refreshIntegrations()
    // Clear the URL params
    window.history.replaceState({}, '', window.location.pathname)
    setTimeout(() => {
      saveMessage.value = null
    }, 5000)
  }
  
  // Google Ads OAuth error
  if (route.query.ads === 'error') {
    const errorMsg = route.query.error as string || 'Unknown error occurred'
    saveError.value = `Google Ads connection failed: ${errorMsg}`
    // Clear the URL params
    window.history.replaceState({}, '', window.location.pathname)
    setTimeout(() => {
      saveError.value = null
    }, 8000)
  }
  
  // Unified Google OAuth success
  if (urlParams.get('google_connected') === 'true') {
    connectMessage.value = 'Google services connected successfully! GA4, Search Console, and Ads are now available.'
    refreshIntegrations()
    // Clear the URL params
    window.history.replaceState({}, '', window.location.pathname)
    setTimeout(() => {
      connectMessage.value = null
    }, 8000)
  }
  
  // Legacy GA4 OAuth success (for backward compatibility)
  if (urlParams.get('success') === 'true' && urlParams.get('integration') === 'ga4') {
    saveMessage.value = 'GA4 connected successfully!'
    refreshIntegrations()
    // Clear the URL params
    window.history.replaceState({}, '', window.location.pathname)
    setTimeout(() => {
      saveMessage.value = null
    }, 5000)
  }
})
</script>

