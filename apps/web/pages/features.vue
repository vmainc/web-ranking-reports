<template>
  <div>
    <section class="border-b border-surface-200 bg-gradient-to-b from-surface-50 to-white py-14 sm:py-16">
      <div class="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h1 class="text-4xl font-bold tracking-tight text-surface-900 sm:text-5xl">Features</h1>
        <p class="mt-4 text-lg text-surface-600">
          Reporting, CRM, campaigns, rank tracking, and AI planning—designed for teams who manage many sites and need one calm place to work.
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <NuxtLink
            to="/auth/register"
            class="inline-flex rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-500"
          >
            Start free
          </NuxtLink>
          <NuxtLink
            to="/pricing"
            class="inline-flex rounded-xl border border-surface-200 bg-white px-6 py-3 text-sm font-semibold text-surface-800 hover:bg-surface-50"
          >
            View pricing
          </NuxtLink>
        </div>
      </div>
    </section>
    <FeaturesGrid section-id="features" />
    <HowItWorks />
    <ProductSection />
    <AgencyPlannerSection />
    <FinalCta />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

useSeoMeta({
  title: 'Features — Web Ranking Reports',
  description:
    'Reporting dashboards, rank tracking, CRM, email campaigns, Agency Planner AI, and per-site billing for digital marketing agencies.',
})
</script>
