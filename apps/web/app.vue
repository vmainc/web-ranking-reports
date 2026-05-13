<template>
  <!-- GTM noscript iframe is injected via nuxt.config `app.head` (bodyClose) to avoid Vue SSR/client hydration mismatch. -->
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const { initAuth } = useAuthState()
onMounted(() => initAuth())
</script>
