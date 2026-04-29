<template>
  <noscript>
    <iframe
      src="https://www.googletagmanager.com/ns.html?id=GTM-K93Q3HB6"
      height="0"
      width="0"
      style="display:none;visibility:hidden"
    />
  </noscript>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const { initAuth } = useAuthState()
onMounted(() => initAuth())
</script>
