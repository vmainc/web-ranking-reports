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
  title: 'Web Ranking Reports — Reporting, CRM & AI planning for agencies',
  description:
    'Reporting, CRM, email campaigns, rank tracking, and AI-powered Agency Planner. Free, Starter, Growth, and Agency plans available.',
  ogTitle: 'Web Ranking Reports',
  ogDescription:
    'Reporting, CRM, and AI planning for digital marketing agencies with Free, Starter, Growth, and Agency plans.',
})
</script>
