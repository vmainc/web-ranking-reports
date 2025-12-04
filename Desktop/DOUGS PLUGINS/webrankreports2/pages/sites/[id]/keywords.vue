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

      <!-- Header Card -->
      <div v-if="site" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Keyword Research</h1>
          <p class="text-gray-600 mb-2">
            <span class="font-medium">{{ site.name }}</span> — {{ site.url }}
          </p>
          <p class="text-sm text-gray-500">
            Discover search patterns, trends, and opportunities. Find what people are searching for to inform your content strategy.
          </p>
        </div>
      </div>

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

      <!-- Main Research Interface -->
      <div v-else-if="site">
        <!-- Success/Error Messages -->
        <div v-if="successMessage" class="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm font-medium text-green-800">{{ successMessage }}</p>
          </div>
        </div>
        <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm font-medium text-red-800">{{ errorMessage }}</p>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-4">
        <!-- Left Sidebar: Keyword Lists -->
        <div class="lg:col-span-1 space-y-6">
          <!-- Keyword Lists Panel -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-900">Keyword Lists</h2>
            </div>
            
            <!-- Lists -->
            <div class="space-y-2 mb-4 max-h-96 overflow-y-auto">
              <div
                v-for="list in lists"
                :key="list.id"
                @click="selectedListId = selectedListId === list.id ? null : list.id"
                :class="[
                  'flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer',
                  selectedListId === list.id
                    ? 'bg-indigo-50 border border-indigo-200'
                    : 'bg-gray-50 hover:bg-gray-100'
                ]"
              >
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    class="w-3 h-3 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: list.color }"
                  ></div>
                  <div class="flex-1 min-w-0">
                    <span class="text-sm font-medium text-gray-900 truncate block">{{ list.name }}</span>
                    <span class="text-xs text-gray-500">
                      {{ getKeywordCountForList(list.id) }} keyword{{ getKeywordCountForList(list.id) !== 1 ? 's' : '' }}
                    </span>
                  </div>
                </div>
                <button
                  @click.stop="confirmDeleteList(list)"
                  class="p-1 text-gray-400 hover:text-red-600 flex-shrink-0"
                  title="Delete list"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <!-- Empty Lists State -->
              <div v-if="!listsPending && lists.length === 0" class="text-sm text-gray-500 text-center py-4">
                No lists yet. Create one below.
              </div>
            </div>

            <!-- Create New List -->
            <div class="border-t border-gray-200 pt-4">
              <div v-if="!showNewListInput" class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Create a new list</span>
                <button
                  @click="showNewListInput = true"
                  class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  New List
                </button>
              </div>
              <div v-else class="space-y-2">
                <input
                  v-model="newListName"
                  @keyup.enter="createNewList"
                  @keyup.esc="showNewListInput = false; newListName = ''"
                  type="text"
                  placeholder="List name"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  autofocus
                />
                <div class="flex items-center gap-2">
                  <button
                    @click="createNewList"
                    class="flex-1 px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Create
                  </button>
                  <button
                    @click="showNewListInput = false; newListName = ''"
                    class="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="lg:col-span-3 space-y-6">
        <!-- Selected List Keywords Table -->
        <div v-if="selectedListId" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div
                class="w-4 h-4 rounded-full"
                :style="{ backgroundColor: getListById(selectedListId)?.color || '#6366f1' }"
              ></div>
              <h2 class="text-lg font-semibold text-gray-900">{{ getListById(selectedListId)?.name || 'List' }}</h2>
              <span class="text-sm text-gray-500">
                ({{ getKeywordsForList(selectedListId).length }} keyword{{ getKeywordsForList(selectedListId).length !== 1 ? 's' : '' }})
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="refreshListResearchData"
                class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Fetch research data for keywords missing it"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </button>
              <button
                @click="selectedListId = null"
                class="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Keywords Table -->
          <div v-if="getKeywordsForList(selectedListId).length > 0" class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Keyword
                  </th>
                  <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Search Volume
                  </th>
                  <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Competition
                  </th>
                  <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPC
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lists
                  </th>
                  <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="keyword in getKeywordsForList(selectedListId)" :key="keyword.id" class="hover:bg-gray-50">
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">{{ keyword.phrase }}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                    {{ keyword.search_volume != null ? formatNumber(keyword.search_volume) : 'N/A' }}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                    <span v-if="keyword.competition" class="capitalize">{{ keyword.competition }}</span>
                    <span v-else class="text-gray-400">N/A</span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                    {{ keyword.cpc != null ? '$' + keyword.cpc.toFixed(2) : 'N/A' }}
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center flex-wrap gap-1">
                      <span
                        v-for="list in keyword.lists"
                        :key="list.id"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        :style="{ backgroundColor: list.color + '20', color: list.color }"
                      >
                        <span
                          class="w-1.5 h-1.5 rounded-full"
                          :style="{ backgroundColor: list.color }"
                        ></span>
                        {{ list.name }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-right text-sm">
                    <button
                      @click="removeKeywordFromList(keyword.id, selectedListId!)"
                      class="text-red-600 hover:text-red-900"
                      title="Remove from list"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty State -->
          <div v-else class="py-12 text-center">
            <svg
              class="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No keywords in this list</h3>
            <p class="text-sm text-gray-500">Add keywords from research results to populate this list.</p>
          </div>
        </div>

        <!-- Keyword Search Box -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Explore Keywords</h2>
          <div class="flex gap-3">
            <div class="flex-1 relative">
              <input
                v-model="searchQuery"
                @keyup.enter="searchKeywords"
                type="text"
                placeholder="Enter a keyword or phrase to research..."
                class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              <svg
                class="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              @click="searchKeywords"
              :disabled="!searchQuery.trim() || searching"
              class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <span v-if="searching" class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching...
              </span>
              <span v-else>Search</span>
            </button>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="searchError" class="bg-red-50 border border-red-200 rounded-xl p-4">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="text-sm font-medium text-red-800">{{ searchError }}</p>
            </div>
          </div>
        </div>

        <!-- Search Results -->
        <div v-if="searchResults" class="space-y-6">
          <!-- Main Keyword Info -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <h2 class="text-xl font-bold text-gray-900 mb-2">{{ searchResults.keyword }}</h2>
                <p class="text-sm text-gray-500">Keyword research results</p>
              </div>
              <div class="flex items-center gap-2">
                <div class="relative">
                  <button
                    @click="toggleAddToListDropdown(searchResults.keyword)"
                    :class="[
                      'inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all border-2',
                      addSuccessState[searchResults.keyword]
                        ? 'text-green-700 bg-green-50 border-green-300'
                        : 'text-indigo-600 bg-indigo-50 border-transparent hover:bg-indigo-100'
                    ]"
                  >
                    <svg v-if="addSuccessState[searchResults.keyword]" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    {{ addSuccessState[searchResults.keyword] ? 'Added!' : 'Add to List' }}
                  </button>
                  <div
                    v-if="activeAddToListDropdown === searchResults.keyword"
                    class="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1"
                    @click.stop
                  >
                    <div
                      v-for="list in lists"
                      :key="list.id"
                      @click="addKeywordToList(searchResults.keyword, list.id)"
                      :class="[
                        'px-4 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors border-2 rounded',
                        addSuccessState[searchResults.keyword]?.listId === list.id
                          ? 'text-green-700 bg-green-50 border-green-300'
                          : 'text-gray-700 hover:bg-gray-100 border-transparent'
                      ]"
                    >
                      <span
                        class="w-2 h-2 rounded-full flex-shrink-0"
                        :style="{ backgroundColor: list.color }"
                      ></span>
                      <span class="flex-1">{{ list.name }}</span>
                      <span v-if="addSuccessState[searchResults.keyword]?.listId === list.id" class="text-green-600 font-medium">
                        ✓
                      </span>
                    </div>
                    <div v-if="lists.length === 0" class="px-4 py-2 text-sm text-gray-500">
                      Create a list first
                    </div>
                  </div>
                </div>
                <button
                  @click="searchResults = null"
                  class="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Key Metrics -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div class="bg-gray-50 rounded-lg p-4">
                <p class="text-xs font-medium text-gray-500 mb-1">Monthly Search Volume</p>
                <p class="text-2xl font-bold text-gray-900">
                  {{ formatNumber(searchResults.searchVolume) || 'N/A' }}
                </p>
              </div>
              <div class="bg-gray-50 rounded-lg p-4">
                <p class="text-xs font-medium text-gray-500 mb-1">Competition</p>
                <p class="text-2xl font-bold text-gray-900">
                  {{ searchResults.competition || 'N/A' }}
                </p>
              </div>
              <div class="bg-gray-50 rounded-lg p-4">
                <p class="text-xs font-medium text-gray-500 mb-1">CPC (Est.)</p>
                <p class="text-2xl font-bold text-gray-900">
                  {{ searchResults.cpc ? '$' + searchResults.cpc.toFixed(2) : 'N/A' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Related Keywords -->
          <div v-if="searchResults.relatedKeywords && searchResults.relatedKeywords.length > 0" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">Related Keywords</h3>
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                  <label class="text-xs text-gray-500">Show:</label>
                  <select
                    v-model="resultsLimit"
                    class="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option :value="5">5</option>
                    <option :value="10">10</option>
                    <option :value="25">25</option>
                    <option :value="50">50</option>
                    <option :value="100">100</option>
                  </select>
                </div>
                <div class="relative">
                  <button
                    @click.stop="toggleAddAllDropdown"
                    class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors border-2"
                    :class="addAllSuccessState ? 'border-green-300 bg-green-50 text-green-700' : 'border-transparent'"
                  >
                    <svg v-if="addAllSuccessState" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    {{ addAllSuccessState ? 'Added All!' : 'Add All' }}
                  </button>
                  <div
                    v-if="showAddAllDropdown"
                    class="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1"
                    data-dropdown
                    @click.stop
                  >
                    <div
                      v-for="list in lists"
                      :key="list.id"
                      @click="addAllRelatedKeywords(list.id)"
                      :class="[
                        'px-4 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors border-2 rounded mx-1 mb-1',
                        addAllSuccessState && addAllSuccessListId === list.id
                          ? 'text-green-700 bg-green-50 border-green-300'
                          : 'text-gray-700 hover:bg-gray-100 border-transparent'
                      ]"
                    >
                      <span
                        class="w-2 h-2 rounded-full flex-shrink-0"
                        :style="{ backgroundColor: list.color }"
                      ></span>
                      <span class="flex-1">{{ list.name }}</span>
                      <span v-if="addAllSuccessState && addAllSuccessListId === list.id" class="text-green-600 font-medium">
                        ✓
                      </span>
                    </div>
                    <div v-if="lists.length === 0" class="px-4 py-2 text-sm text-gray-500">
                      Create a list first
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Keyword
                    </th>
                    <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Search Volume
                    </th>
                    <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Competition
                    </th>
                    <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPC
                    </th>
                    <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                    <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Add to List
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="(related, index) in displayedRelatedKeywords" :key="index" class="hover:bg-gray-50">
                    <td class="px-4 py-3 whitespace-nowrap">
                      <div class="text-sm font-medium text-gray-900">{{ related.keyword }}</div>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                      {{ formatNumber(related.searchVolume) || 'N/A' }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                      {{ related.competition || 'N/A' }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                      {{ related.cpc ? '$' + related.cpc.toFixed(2) : 'N/A' }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-center text-sm">
                      <button
                        @click="searchForKeyword(related.keyword)"
                        class="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        Research
                      </button>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-center text-sm">
                      <div class="relative inline-block">
                        <button
                          @click.stop="toggleAddToListDropdown(related.keyword)"
                          class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                          </svg>
                          Add
                        </button>
                        <div
                          v-if="activeAddToListDropdown === related.keyword"
                          class="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1"
                          data-dropdown
                          @click.stop
                        >
                          <div
                            v-for="list in lists"
                            :key="list.id"
                            @click="addKeywordToList(related.keyword, list.id)"
                            class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                          >
                            <span
                              class="w-2 h-2 rounded-full"
                              :style="{ backgroundColor: list.color }"
                            ></span>
                            {{ list.name }}
                          </div>
                          <div v-if="lists.length === 0" class="px-4 py-2 text-sm text-gray-500">
                            Create a list first
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Long Tail Keywords -->
          <div v-if="searchResults.longTailKeywords && searchResults.longTailKeywords.length > 0" class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Long Tail Variations</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="(longTail, index) in searchResults.longTailKeywords"
                :key="index"
                class="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                @click="searchForKeyword(longTail.keyword)"
              >
                <div class="flex items-start justify-between mb-2">
                  <p class="text-sm font-medium text-gray-900 flex-1">{{ longTail.keyword }}</p>
                  <div class="flex items-center gap-1 ml-2">
                    <div class="relative">
                      <button
                        @click.stop="toggleAddToListDropdown(longTail.keyword)"
                        class="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-gray-100 transition-colors"
                        title="Add to list"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <div
                        v-if="activeAddToListDropdown === longTail.keyword"
                        class="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1"
                        @click.stop
                      >
                        <div
                          v-for="list in lists"
                          :key="list.id"
                          @click="addKeywordToList(longTail.keyword, list.id)"
                          class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                        >
                          <span
                            class="w-2 h-2 rounded-full"
                            :style="{ backgroundColor: list.color }"
                          ></span>
                          {{ list.name }}
                        </div>
                        <div v-if="lists.length === 0" class="px-4 py-2 text-sm text-gray-500">
                          Create a list first
                        </div>
                      </div>
                    </div>
                    <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <div class="flex items-center justify-between text-xs text-gray-500">
                  <span>Volume: {{ formatNumber(longTail.searchVolume) || 'N/A' }}</span>
                  <span v-if="longTail.cpc">${{ longTail.cpc.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State for Results -->
          <div v-if="!searchResults.relatedKeywords?.length && !searchResults.longTailKeywords?.length" class="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <svg
              class="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No related keywords found</h3>
            <p class="text-sm text-gray-500">Try searching for a different keyword or phrase.</p>
          </div>
        </div>

        <!-- Initial Empty State -->
        <div v-else class="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <svg
            class="mx-auto h-16 w-16 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Start Your Keyword Research</h3>
          <p class="text-sm text-gray-500 mb-6">
            Enter a keyword or phrase above to discover search volume, related keywords, and long tail variations.
          </p>
          <div class="flex flex-wrap gap-2 justify-center">
            <button
              v-for="example in exampleKeywords"
              :key="example"
              @click="searchForKeyword(example)"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {{ example }}
            </button>
          </div>
        </div>
        </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useNuxtApp } from '#imports'
import { useSite } from '~/composables/useSite'
import { useAuth } from '~/composables/useAuth'
import { useKeywordLists } from '~/composables/useKeywordLists'
import { useKeywords } from '~/composables/useKeywords'
import { useRuntimeConfig } from '#app'

definePageMeta({
  layout: false
})

const route = useRoute()
const config = useRuntimeConfig()
const siteId = computed(() => String(route.params.id || ''))

const { site, pending: sitePending, error: siteError } = useSite(siteId)
const { userInitials, fetchUserInitials, handleLogout } = useAuth()

// Keyword lists
const {
  lists,
  pending: listsPending,
  createList,
  deleteList,
  refresh: refreshLists
} = useKeywordLists(siteId)

// Keywords management
const {
  keywords,
  addKeywords,
  removeKeywordFromList: removeKeywordFromListComposable,
  refresh: refreshKeywords
} = useKeywords(siteId)

// Search state
const searchQuery = ref('')
const searching = ref(false)
const searchError = ref<string | null>(null)
const searchResults = ref<{
  keyword: string
  searchVolume: number | null
  competition: string | null
  cpc: number | null
  relatedKeywords: Array<{
    keyword: string
    searchVolume: number | null
    competition: string | null
    cpc: number | null
  }>
  longTailKeywords: Array<{
    keyword: string
    searchVolume: number | null
    cpc: number | null
  }>
} | null>(null)

// List management state
const showNewListInput = ref(false)
const newListName = ref('')
const activeAddToListDropdown = ref<string | null>(null)
const selectedListId = ref<string | null>(null)
const successMessage = ref('')
const errorMessage = ref('')
const resultsLimit = ref(5) // Default to 5, can be 5, 10, 25, 50, or 100
const addSuccessState = ref<Record<string, { listId: string; timestamp: number }>>({})
const showAddAllDropdown = ref(false)
const addAllSuccessState = ref(false)
const addAllSuccessListId = ref<string | null>(null)

// Example keywords for quick start
const exampleKeywords = [
  'digital marketing',
  'web design',
  'seo services',
  'content marketing',
  'social media strategy'
]

// Format numbers
const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined || num === 0) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

// Search for keywords
const searchKeywords = async () => {
  if (!searchQuery.value.trim()) return

  searching.value = true
  searchError.value = null
  searchResults.value = null

  try {
    const nuxtApp = useNuxtApp()
    const $supabase = nuxtApp.$supabase

    const { data: session } = await $supabase.auth.getSession()
    if (!session?.session) {
      throw new Error('Not authenticated')
    }

    const functionsBaseUrl = config.public.supabaseFunctionsUrl as string
    if (!functionsBaseUrl) {
      throw new Error('Supabase Functions URL not configured')
    }

    const anonKey = config.public.supabaseAnonKey as string

    const response = await fetch(`${functionsBaseUrl}/keyword-research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session.access_token}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({
        site_id: siteId.value,
        keyword: searchQuery.value.trim(),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Failed to search keywords')
    }

    const data = await response.json()
    searchResults.value = data
  } catch (err: any) {
    console.error('Keyword search error:', err)
    searchError.value = err.message || 'Failed to search keywords. Please try again.'
  } finally {
    searching.value = false
  }
}

// Search for a specific keyword (from related/long tail)
const searchForKeyword = (keyword: string) => {
  searchQuery.value = keyword
  searchKeywords()
}

// Create new list
const createNewList = async () => {
  if (!newListName.value.trim()) return

  try {
    await createList(newListName.value.trim())
    newListName.value = ''
    showNewListInput.value = false
    successMessage.value = 'List created successfully'
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error: any) {
    errorMessage.value = error.message || 'Failed to create list'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  }
}

// Confirm delete list
const confirmDeleteList = async (list: { id: string; name: string }) => {
  if (!confirm(`Are you sure you want to delete the list "${list.name}"? Keywords in this list will not be deleted, but they will be removed from the list.`)) {
    return
  }

  try {
    await deleteList(list.id)
    successMessage.value = 'List deleted successfully'
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error: any) {
    errorMessage.value = error.message || 'Failed to delete list'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  }
}

// Toggle add to list dropdown
const toggleAddToListDropdown = (keyword: string) => {
  if (activeAddToListDropdown.value === keyword) {
    activeAddToListDropdown.value = null
  } else {
    activeAddToListDropdown.value = keyword
  }
}

// Add keyword to list
const addKeywordToList = async (keyword: string, listId: string) => {
  try {
    // Find research data for this keyword if available
    let researchData: Array<{ phrase: string; searchVolume?: number | null; competition?: string | null; cpc?: number | null }> | undefined
    
    if (searchResults && keyword) {
      const keywordLower = keyword.toLowerCase().trim()
      
      // Check if it's the main keyword
      if (searchResults.keyword && searchResults.keyword.toLowerCase().trim() === keywordLower) {
        researchData = [{
          phrase: keyword,
          searchVolume: searchResults.searchVolume ?? null,
          competition: searchResults.competition ?? null,
          cpc: searchResults.cpc ?? null,
        }]
        console.log('Adding main keyword with research data:', researchData)
      } else {
        // Check related keywords
        const related = searchResults.relatedKeywords?.find(r => r?.keyword && r.keyword.toLowerCase().trim() === keywordLower)
        if (related) {
          researchData = [{
            phrase: keyword,
            searchVolume: related.searchVolume ?? null,
            competition: related.competition ?? null,
            cpc: related.cpc ?? null,
          }]
          console.log('Adding related keyword with research data:', researchData)
        } else {
          // Check long tail keywords
          const longTail = searchResults.longTailKeywords?.find(l => l?.keyword && l.keyword.toLowerCase().trim() === keywordLower)
          if (longTail) {
            researchData = [{
              phrase: keyword,
              searchVolume: longTail.searchVolume ?? null,
              competition: null, // Long tail might not have competition
              cpc: longTail.cpc ?? null,
            }]
            console.log('Adding long tail keyword with research data:', researchData)
          } else {
            console.log('No research data found for keyword:', keyword)
          }
        }
      }
    }
    
    // Add keyword to list
    await addKeywords([keyword], [listId], researchData)
    
    // If no research data was available, fetch it automatically
    if (!researchData || (researchData[0]?.searchVolume == null && researchData[0]?.competition == null && researchData[0]?.cpc == null)) {
      try {
        console.log('No research data available, fetching automatically...')
        await fetchAndUpdateKeywordResearch(keyword)
      } catch (fetchError) {
        console.error('Failed to auto-fetch research data:', fetchError)
        // Continue anyway - keyword was added successfully
      }
    }
    
    await refreshKeywords() // Refresh to get updated keyword data
    activeAddToListDropdown.value = null
    
    // Show success state on the add button
    addSuccessState.value[keyword] = {
      listId,
      timestamp: Date.now()
    }
    
    // Clear success state after 3 seconds
    setTimeout(() => {
      delete addSuccessState.value[keyword]
    }, 3000)
    
    successMessage.value = `"${keyword}" added to list`
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error: any) {
    console.error('Error adding keyword to list:', error)
    errorMessage.value = error.message || 'Failed to add keyword to list'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  }
}

// Get keywords for a specific list
const getKeywordsForList = (listId: string | null) => {
  if (!listId || !keywords.value) return []
  return keywords.value.filter(k => k.lists.some(l => l.id === listId))
}

// Fetch research data for a keyword and update it
const fetchAndUpdateKeywordResearch = async (keywordPhrase: string) => {
  if (!siteId.value || !keywordPhrase.trim()) return
  
  try {
    const config = useRuntimeConfig()
    const nuxtApp = useNuxtApp()
    const $supabase = nuxtApp.$supabase

    const { data: session } = await $supabase.auth.getSession()
    if (!session?.session) {
      throw new Error('Not authenticated')
    }

    const functionsBaseUrl = config.public.supabaseFunctionsUrl as string
    if (!functionsBaseUrl) {
      throw new Error('Supabase Functions URL not configured')
    }

    const anonKey = config.public.supabaseAnonKey as string

    const response = await fetch(`${functionsBaseUrl}/keyword-research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session.access_token}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({
        site_id: siteId.value,
        keyword: keywordPhrase.trim(),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Failed to fetch research data')
    }

    const researchData = await response.json()
    
    // Update the keyword in the database with the research data
    const researchDataToSave: Array<{ phrase: string; searchVolume?: number | null; competition?: string | null; cpc?: number | null }> = [{
      phrase: keywordPhrase.trim(),
      searchVolume: researchData.searchVolume,
      competition: researchData.competition,
      cpc: researchData.cpc,
    }]
    
    await addKeywords([keywordPhrase.trim()], undefined, researchDataToSave)
    await refreshKeywords()
    
    return researchData
  } catch (err: any) {
    console.error('Error fetching keyword research:', err)
    throw err
  }
}

// Fetch research data for all keywords in the selected list that are missing it
const refreshListResearchData = async () => {
  if (!selectedListId.value) return
  
  const listKeywords = getKeywordsForList(selectedListId.value)
  const keywordsNeedingData = listKeywords.filter(k => 
    k.search_volume == null && k.competition == null && k.cpc == null
  )
  
  if (keywordsNeedingData.length === 0) {
    successMessage.value = 'All keywords already have research data'
    setTimeout(() => { successMessage.value = '' }, 3000)
    return
  }
  
  try {
    successMessage.value = `Fetching research data for ${keywordsNeedingData.length} keyword${keywordsNeedingData.length !== 1 ? 's' : ''}...`
    
    // Fetch research data for each keyword (with a small delay to avoid rate limiting)
    for (const keyword of keywordsNeedingData) {
      try {
        await fetchAndUpdateKeywordResearch(keyword.phrase)
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (err) {
        console.error(`Failed to fetch research for "${keyword.phrase}":`, err)
      }
    }
    
    successMessage.value = `Research data updated for ${keywordsNeedingData.length} keyword${keywordsNeedingData.length !== 1 ? 's' : ''}`
    setTimeout(() => { successMessage.value = '' }, 5000)
  } catch (error: any) {
    errorMessage.value = error.message || 'Failed to refresh research data'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  }
}

// Get keyword count for a list
const getKeywordCountForList = (listId: string): number => {
  return getKeywordsForList(listId).length
}

// Get displayed related keywords based on limit
const displayedRelatedKeywords = computed(() => {
  if (!searchResults.value?.relatedKeywords) return []
  return searchResults.value.relatedKeywords.slice(0, resultsLimit.value)
})

// Toggle add all dropdown
const toggleAddAllDropdown = () => {
  showAddAllDropdown.value = !showAddAllDropdown.value
}

// Add all related keywords to a list
const addAllRelatedKeywords = async (listId: string) => {
  if (!searchResults.value?.relatedKeywords || searchResults.value.relatedKeywords.length === 0) return
  
  try {
    const keywordsToAdd = displayedRelatedKeywords.value.map(r => r.keyword)
    const researchData: Array<{ phrase: string; searchVolume?: number | null; competition?: string | null; cpc?: number | null }> = displayedRelatedKeywords.value.map(related => ({
      phrase: related.keyword,
      searchVolume: related.searchVolume ?? null,
      competition: related.competition ?? null,
      cpc: related.cpc ?? null,
    }))
    
    // Add all keywords at once
    await addKeywords(keywordsToAdd, [listId], researchData)
    
    // Fetch research data for any that might be missing it
    for (const keyword of keywordsToAdd) {
      const keywordData = researchData.find(r => r.phrase === keyword)
      if (!keywordData || (keywordData.searchVolume == null && keywordData.competition == null && keywordData.cpc == null)) {
        try {
          await fetchAndUpdateKeywordResearch(keyword)
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 300))
        } catch (fetchError) {
          console.error(`Failed to auto-fetch research for "${keyword}":`, fetchError)
        }
      }
    }
    
    await refreshKeywords()
    showAddAllDropdown.value = false
    
    // Show success state
    addAllSuccessState.value = true
    addAllSuccessListId.value = listId
    
    successMessage.value = `Added ${keywordsToAdd.length} keyword${keywordsToAdd.length !== 1 ? 's' : ''} to list`
    setTimeout(() => { 
      successMessage.value = ''
      addAllSuccessState.value = false
      addAllSuccessListId.value = null
    }, 3000)
  } catch (error: any) {
    console.error('Error adding all keywords:', error)
    errorMessage.value = error.message || 'Failed to add keywords to list'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  }
}

// Get list by ID
const getListById = (listId: string | null) => {
  if (!listId) return null
  return lists.value.find(l => l.id === listId) || null
}

// Remove keyword from list
const removeKeywordFromList = async (keywordId: string, listId: string) => {
  try {
    await removeKeywordFromListComposable(keywordId, listId)
    await refreshKeywords()
    successMessage.value = 'Keyword removed from list'
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error: any) {
    errorMessage.value = error.message || 'Failed to remove keyword from list'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  }
}

// Initialize
onMounted(async () => {
  await fetchUserInitials()
  await refreshKeywords() // Load keywords on mount
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    if (activeAddToListDropdown.value && !target.closest('[data-dropdown]')) {
      activeAddToListDropdown.value = null
    }
    if (showAddAllDropdown.value && !target.closest('[data-dropdown]')) {
      showAddAllDropdown.value = false
    }
  })
})
</script>
