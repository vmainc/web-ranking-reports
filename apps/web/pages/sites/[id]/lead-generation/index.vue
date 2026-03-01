<template><div class="p-4 text-surface-500">Redirecting…</div></template>
<script setup lang="ts">
const route = useRoute()
const siteId = route.params.id as string
onMounted(() => navigateTo(`/sites/${siteId}/lead-generation/forms`, { replace: true }))
</script>
