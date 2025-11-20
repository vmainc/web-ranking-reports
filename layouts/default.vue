<template>
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <NuxtLink to="/dashboard" class="text-xl font-bold text-gray-900">
                WebRankingReports
              </NuxtLink>
            </div>
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <NuxtLink
                to="/dashboard"
                class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Dashboard
              </NuxtLink>
              <NuxtLink
                to="/sites"
                class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Sites
              </NuxtLink>
            </div>
          </div>
          <div class="flex items-center">
            <button
              @click="handleLogout"
              class="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
    
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { $supabase } = useNuxtApp()

const handleLogout = async () => {
  await $supabase.auth.signOut()
  await navigateTo('/auth/login')
}
</script>

