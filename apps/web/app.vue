<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const { initAuth } = useAuthState()
onMounted(() => initAuth())
</script>
