<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6 sm:py-8">
    <div class="mb-6">
      <NuxtLink to="/crm/proposals" class="text-sm text-surface-500 hover:text-primary-600">← Proposals</NuxtLink>
      <h1 class="mt-2 text-2xl font-semibold text-surface-900">Service packages &amp; template</h1>
      <p class="mt-1 text-sm text-surface-500">
        Your agency catalog—add packages, set default prices, then customize amount and scope on each proposal.
      </p>
    </div>

    <CrmSubNav />

    <CrmProposalServicePackagesSettings title="Service packages" :compact="false" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>