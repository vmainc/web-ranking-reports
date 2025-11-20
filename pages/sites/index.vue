<template>
  <div>
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold text-gray-900">Sites</h1>
          <button class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
            Add Site
          </button>
        </div>
        
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="p-6">
            <p class="text-gray-600">Your sites will appear here. Click "Add Site" to get started.</p>
          </div>
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

