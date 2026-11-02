<script setup lang="ts">
definePageMeta({ layout: 'default' })

await navigateTo('/crm/sales', { replace: true })
</script>

<template>
  <div class="px-4 py-4 text-sm text-slate-400 sm:py-8">Redirecting to Sales…</div>
</template>
