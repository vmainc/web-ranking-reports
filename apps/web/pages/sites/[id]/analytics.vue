<template>
  <div class="flex min-h-[40vh] items-center justify-center">
    <p class="text-surface-500">Redirecting to dashboard…</p>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const siteId = route.params.id as string

// Always go to the analytics dashboard; this URL is no longer used.
await navigateTo(`/sites/${siteId}/dashboard`, { replace: true })
</script>
