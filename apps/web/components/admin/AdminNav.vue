<template>
  <nav class="mb-6 flex flex-wrap gap-2 border-b border-surface-200 pb-4">
    <NuxtLink
      to="/admin/integrations"
      class="rounded-lg px-3 py-2 text-sm font-medium transition"
      :class="integrationsActive ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200' : 'text-surface-600 hover:bg-surface-50'"
    >
      Integrations
    </NuxtLink>
    <NuxtLink
      to="/admin/users"
      class="rounded-lg px-3 py-2 text-sm font-medium transition"
      :class="usersActive ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200' : 'text-surface-600 hover:bg-surface-50'"
    >
      Users
    </NuxtLink>
    <NuxtLink
      to="/admin/emails"
      class="rounded-lg px-3 py-2 text-sm font-medium transition"
      :class="emailsActive ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200' : 'text-surface-600 hover:bg-surface-50'"
    >
      Emails
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()

/** Normalize path so tab state matches the URL (avoid prefix / SSR quirks). */
const norm = computed(() => {
  const p = route.path.replace(/\/$/, '') || '/'
  return p
})

const integrationsActive = computed(() => norm.value === '/admin/integrations')
const usersActive = computed(() => norm.value === '/admin/users')
const emailsActive = computed(() => norm.value === '/admin/emails')
</script>
