<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-surface-900">Onboarding</h1>
        <p class="mt-1 text-sm text-surface-500">New client onboarding checklist. Connect a client to a site to see integration status here.</p>
      </div>
      <NuxtLink to="/crm" class="text-sm font-medium text-surface-600 hover:text-primary-600">← CRM</NuxtLink>
    </div>

    <nav class="mb-6 flex flex-wrap gap-1 border-b border-surface-200">
      <NuxtLink to="/crm" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Dashboard</NuxtLink>
      <NuxtLink to="/crm/clients" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Clients</NuxtLink>
      <NuxtLink to="/crm/pipeline" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Leads</NuxtLink>
      <NuxtLink to="/crm/tasks" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Tasks</NuxtLink>
      <NuxtLink to="/crm/deals" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Proposals</NuxtLink>
      <NuxtLink to="/crm/onboarding" class="border-b-2 border-primary-600 px-4 py-3 text-sm font-medium text-primary-600">Onboarding</NuxtLink>
    </nav>

    <section class="rounded-xl border border-surface-200 bg-white shadow-sm">
      <h2 class="border-b border-surface-200 px-6 py-4 text-lg font-semibold text-surface-900">Setup checklist</h2>
      <p class="px-6 py-2 text-sm text-surface-500">When a client is linked to a site, items below will reflect that site’s integrations (e.g. Google Analytics, Search Console). For now this is a placeholder.</p>
      <ul class="divide-y divide-surface-200 px-6">
        <li class="flex items-center gap-3 py-4">
          <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-surface-300 bg-surface-50 text-surface-400" aria-hidden="true">—</span>
          <span class="text-surface-700">Google Analytics connected</span>
        </li>
        <li class="flex items-center gap-3 py-4">
          <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-surface-300 bg-surface-50 text-surface-400" aria-hidden="true">—</span>
          <span class="text-surface-700">Search Console connected</span>
        </li>
        <li class="flex items-center gap-3 py-4">
          <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-surface-300 bg-surface-50 text-surface-400" aria-hidden="true">—</span>
          <span class="text-surface-700">Site added and verified</span>
        </li>
        <li class="flex items-center gap-3 py-4">
          <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-surface-300 bg-surface-50 text-surface-400" aria-hidden="true">—</span>
          <span class="text-surface-700">First report run (Lighthouse / rankings)</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>
