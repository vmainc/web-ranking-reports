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
    'Reporting, CRM, email campaigns, rank tracking, and AI-powered Agency Planner. $19.99/site/month. 14-day free trial, no credit card required.',
  ogTitle: 'Web Ranking Reports',
  ogDescription:
    'Reporting, CRM, and AI planning for digital marketing agencies. Start your free trial—no credit card required.',
})
</script>
