<template>
  <div>
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})
</script>

