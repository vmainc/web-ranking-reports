<template>
  <div>
    <section class="border-b border-surface-200 bg-gradient-to-b from-surface-50 to-white py-14 sm:py-20">
      <div class="mx-auto max-w-2xl px-4 sm:px-6">
        <h1 class="text-4xl font-bold tracking-tight text-surface-900 sm:text-5xl">Contact</h1>
        <p class="mt-6 text-lg leading-relaxed text-surface-600">
          Questions about the product, billing, or whether Web Ranking Reports fits your agency? Reach out—we read every message.
        </p>
        <div class="mt-10 rounded-2xl border border-surface-200 bg-white p-6 shadow-card sm:p-8">
          <p class="text-sm font-medium text-surface-500">Email</p>
          <a
            href="mailto:support@webrankingreports.com"
            class="mt-2 inline-block text-lg font-semibold text-primary-600 hover:text-primary-500"
          >
            support@webrankingreports.com
          </a>
          <p class="mt-6 text-sm text-surface-600">
            Prefer to explore first?
            <NuxtLink to="/pricing" class="font-medium text-primary-600 hover:underline">See pricing</NuxtLink>
            or
            <NuxtLink to="/auth/register" class="font-medium text-primary-600 hover:underline">start a free trial</NuxtLink>.
          </p>
        </div>
      </div>
    </section>
    <FinalCta />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

useSeoMeta({
  title: 'Contact — Web Ranking Reports',
  description: 'Contact Web Ranking Reports for product and billing questions.',
})
</script>
