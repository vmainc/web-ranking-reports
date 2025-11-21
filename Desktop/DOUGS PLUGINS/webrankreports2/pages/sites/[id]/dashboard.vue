<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <NuxtLink to="/dashboard" class="flex items-center space-x-2">
              <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="32" width="6" height="8" rx="2" fill="#F97316"/>
                <rect x="16" y="24" width="6" height="16" rx="2" fill="#14B8A6"/>
                <rect x="24" y="12" width="6" height="28" rx="2" fill="#3B82F6"/>
                <path d="M6 36 Q18 20 30 14" stroke="#EC4899" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                <path d="M28 12 L32 16 L28 20" stroke="#EC4899" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div>
                <h1 class="text-xl font-bold text-gray-900">WebRanking</h1>
                <p class="text-xs text-gray-600 -mt-1">Reports</p>
              </div>
            </NuxtLink>
          </div>
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
            <button
              @click="handleLogout"
              class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="mb-6">
        <NuxtLink
          to="/sites"
          class="text-indigo-600 hover:text-indigo-500 text-sm font-medium mb-4 inline-block"
        >
          ← Back to Sites
        </NuxtLink>
        <h1 class="text-3xl font-bold text-gray-900">Site Dashboard</h1>
        <p class="text-gray-600 mt-2">Site ID: {{ $route.params.id }}</p>
      </div>
      
      <div class="bg-white shadow rounded-lg p-6">
        <p class="text-gray-600">Detailed analytics and ranking data for this site will appear here.</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: false
})

const nuxtApp = useNuxtApp()
const $supabase = nuxtApp.$supabase

const handleLogout = async () => {
  if ($supabase) {
    await $supabase.auth.signOut()
  }
  await navigateTo('/auth/login')
}
</script>

