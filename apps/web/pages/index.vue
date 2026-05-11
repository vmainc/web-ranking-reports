<template>
  <div>
    <DarkHero />
    <DarkRankingsSection />
    <DarkTrafficSection />
    <DarkReportPreview />
    <DarkPricingSection />
    <DarkFinalCta />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'marketing-dark',
})

useSeoMeta({
  title: 'Web Ranking Reports — Rankings, traffic & client reports',
  description:
    'Track keyword movement, wire GA4 and Search Console, and ship scheduled PDF reports. Per-site pricing. Built for agencies that care about outcomes.',
  ogTitle: 'Web Ranking Reports',
  ogDescription: 'Rankings, traffic intelligence, and client-ready reports — one workspace.',
})
</script>
