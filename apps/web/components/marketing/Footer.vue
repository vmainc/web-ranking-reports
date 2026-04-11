<template>
  <footer class="border-t border-surface-200 bg-white py-10">
    <div class="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 sm:flex-row sm:items-center sm:px-6">
      <NuxtLink to="/" class="flex items-center gap-2 font-semibold text-surface-900">
        <span class="text-primary-600">WRR</span>
        <span>Web Ranking Reports</span>
      </NuxtLink>
      <nav class="flex flex-wrap gap-x-8 gap-y-2 text-sm font-medium text-surface-600" aria-label="Footer">
        <NuxtLink to="/features" class="hover:text-primary-600">Features</NuxtLink>
        <NuxtLink to="/pricing" class="hover:text-primary-600">Pricing</NuxtLink>
        <NuxtLink to="/auth/login" class="hover:text-primary-600">Log In</NuxtLink>
      </nav>
    </div>
    <div class="mx-auto mt-8 max-w-6xl border-t border-surface-100 px-4 pt-8 sm:px-6">
      <p class="text-center text-xs text-surface-500">© {{ year }} Web Ranking Reports. All rights reserved.</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>
