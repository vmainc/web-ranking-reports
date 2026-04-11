<template>
  <div class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
    <h2 class="text-lg font-semibold">Subscription required</h2>
    <p class="mt-2 text-sm text-amber-900/90">
      This site’s trial has ended. Upgrade to keep using reports, integrations, and tools for this site.
    </p>
    <NuxtLink
      :to="{ path: '/settings/billing', query: siteId ? { site: siteId } : {} }"
      class="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
    >
      Go to billing
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
defineProps<{ siteId?: string }>()
</script>
