<template>
  <div>
    <section class="border-b border-surface-200 bg-gradient-to-b from-surface-50 to-white py-14 sm:py-16">
      <div class="mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
        <h1 class="text-4xl font-bold tracking-tight text-surface-900 sm:text-5xl">Pricing</h1>
        <p class="mt-4 text-lg text-surface-600">
          Per-site billing, a full trial, and no card on file until you choose to subscribe.
        </p>
      </div>
    </section>
    <PricingSection section-id="pricing" />
    <FaqSection />
    <FinalCta />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

useSeoMeta({
  title: 'Pricing — Web Ranking Reports',
  description: 'Compare Free, Starter, Growth, and Agency plans for reporting, CRM, email, and agency-ready client reporting.',
})
</script>
