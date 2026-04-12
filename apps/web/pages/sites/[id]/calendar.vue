<script setup lang="ts">
/**
 * Per-site Google Calendar was removed; dashboard calendar is workspace-wide under Account.
 */
definePageMeta({ layout: 'default' })

await navigateTo({ path: '/account', hash: '#workspace-google-calendar' }, { replace: true })
</script>

<template>
  <div class="mx-auto max-w-lg px-4 py-16 text-center text-sm text-surface-500">Opening Account…</div>
</template>
