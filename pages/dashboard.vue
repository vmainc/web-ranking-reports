<template>
  <div>
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <h1 class="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
        
        <div class="bg-white shadow rounded-lg p-6">
          <p class="text-gray-600">Welcome to your dashboard. This is where you'll see an overview of your sites and rankings.</p>
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

