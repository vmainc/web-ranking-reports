<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
    <div class="mb-6">
      <NuxtLink to="/crm/proposals" class="text-sm text-surface-500 hover:text-primary-600">← Proposals</NuxtLink>
      <h1 class="mt-2 text-2xl font-semibold text-surface-900">Proposal catalog</h1>
      <p class="mt-1 text-sm text-surface-500">
        Products come from your agency’s WooCommerce catalog site — never from a prospect site.
        You can also connect this under
        <NuxtLink to="/agency" class="font-medium text-primary-600 hover:underline">Agency</NuxtLink>.
      </p>
    </div>

    <CrmSubNav />

    <CrmProposalCatalogSettings title="Catalog site" :show-crm-link="false" :product-limit="50" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>
