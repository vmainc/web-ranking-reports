<template>
  <div />
</template>

<script setup lang="ts">
// /sites/ has no list page; redirect to dashboard (avoids 404 from Nuxt prefetch of parent route)
await navigateTo('/dashboard', { replace: true })
</script>
