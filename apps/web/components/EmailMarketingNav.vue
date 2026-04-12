<template>
  <nav class="mb-6 flex flex-wrap items-end gap-x-1 gap-y-2 border-b border-surface-200">
    <NuxtLink
      to="/email"
      class="border-b-2 px-4 py-3 text-sm font-medium transition"
      :class="
        isList
          ? 'border-primary-600 text-primary-600'
          : 'border-transparent text-surface-600 hover:text-surface-900'
      "
    >
      Campaigns
    </NuxtLink>
    <NuxtLink
      to="/email/create"
      class="border-b-2 px-4 py-3 text-sm font-medium transition"
      :class="
        isCreate
          ? 'border-primary-600 text-primary-600'
          : 'border-transparent text-surface-600 hover:text-surface-900'
      "
    >
      New campaign
    </NuxtLink>
    <p class="w-full text-xs text-surface-500 sm:ml-auto sm:w-auto sm:pb-3 sm:pl-4">
      Recipients use
      <NuxtLink to="/crm/clients" class="font-medium text-primary-600 hover:underline">CRM contacts &amp; leads</NuxtLink>
      — add or edit people there anytime.
    </p>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const isList = computed(() => {
  const p = route.path.replace(/\/$/, '') || '/'
  return p === '/email'
})
const isCreate = computed(() => route.path.includes('/email/create'))
</script>
