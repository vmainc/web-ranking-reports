<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <div class="mb-8">
      <NuxtLink
        :to="`/sites/${siteId}/settings`"
        class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
      >
        ← Site settings
      </NuxtLink>
      <h1 class="text-2xl font-semibold text-surface-900">Google Local Service Ads</h1>
      <p class="mt-1 text-sm text-surface-500">
        Integration is connected through your Google account. Local Service Ads reporting UI is coming soon.
      </p>
    </div>

    <section class="rounded-xl border border-surface-200 bg-white p-6 shadow-card">
      <h2 class="text-lg font-medium text-surface-900">What this does</h2>
      <ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-surface-600">
        <li>Lets you turn on/off the Local Service Ads integration per site.</li>
        <li>Uses the same Google OAuth connection as Analytics / Search Console / Ads.</li>
        <li>Prepares this site for upcoming LSA reporting modules.</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const siteId = computed(() => String(route.params.id ?? ''))
</script>
