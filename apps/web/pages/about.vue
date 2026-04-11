<template>
  <div>
    <section class="border-b border-surface-200 bg-gradient-to-b from-surface-50 to-white py-14 sm:py-20">
      <div class="mx-auto max-w-2xl px-4 sm:px-6">
        <h1 class="text-4xl font-bold tracking-tight text-surface-900 sm:text-5xl">About</h1>
        <p class="mt-6 text-lg leading-relaxed text-surface-600">
          Web Ranking Reports exists to reduce chaos for digital marketing agencies and consultants. Too many teams juggle
          spreadsheets, disconnected CRMs, and reporting tools that don’t talk to each other—we’re building a single
          workspace where performance, contacts, and execution live together.
        </p>
        <p class="mt-4 text-lg leading-relaxed text-surface-600">
          We care about clear UX, honest pricing per site, and features you’ll actually use—not bloat for a slide deck.
        </p>
        <div class="mt-10">
          <NuxtLink to="/auth/register" class="font-semibold text-primary-600 hover:text-primary-500">Start your free trial →</NuxtLink>
        </div>
      </div>
    </section>
    <FinalCta />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

useSeoMeta({
  title: 'About — Web Ranking Reports',
  description: 'Why we built Web Ranking Reports: reporting, CRM, and execution tools for digital marketing agencies.',
})
</script>
