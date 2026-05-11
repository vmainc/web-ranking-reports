<template>
  <div>
    <HeroSection />
    <FeatureStrip />
    <FeaturesGrid section-id="features" />
    <HowItWorks />
    <AgencyPlannerSection />
    <PricingSection section-id="pricing" />
    <FaqSection />
    <FinalCta />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'marketing',
})

useSeoMeta({
  title: 'Platform overview — Web Ranking Reports',
  description:
    'Reporting, CRM, email campaigns, rank tracking, and AI-powered Agency Planner. Free, Starter, Growth, and Agency plans available.',
  ogTitle: 'Web Ranking Reports — Platform overview',
  ogDescription:
    'Reporting, CRM, and AI planning for digital marketing agencies with Free, Starter, Growth, and Agency plans.',
})
</script>
