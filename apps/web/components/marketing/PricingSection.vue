<template>
  <section :id="sectionId" class="border-t border-surface-200 bg-surface-50 py-20 sm:py-24">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="mx-auto max-w-lg text-center">
        <h2 class="text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">Pricing</h2>
        <p class="mt-4 text-lg text-surface-600">Straightforward. Per site. No surprises.</p>
      </div>

      <div class="mx-auto mt-12 max-w-md">
        <div class="rounded-2xl border border-surface-200 bg-white p-8 shadow-md sm:p-10">
          <div class="text-center">
            <div class="flex items-baseline justify-center gap-1">
              <span class="text-5xl font-bold tracking-tight text-surface-900">$19.99</span>
            </div>
            <p class="mt-1 text-surface-600">per site / month</p>
            <p class="mt-4 text-sm font-medium text-primary-700">14-day free trial · No credit card required</p>
          </div>
          <ul class="mt-8 space-y-3 border-t border-surface-100 pt-8 text-left text-sm text-surface-700">
            <li v-for="item in bullets" :key="item" class="flex gap-2">
              <span class="text-primary-600" aria-hidden="true">✓</span>
              <span>{{ item }}</span>
            </li>
          </ul>
          <NuxtLink
            to="/auth/register"
            class="mt-8 flex w-full items-center justify-center rounded-lg bg-primary-600 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-500"
          >
            Start Free
          </NuxtLink>
          <p class="mt-4 text-center text-xs text-surface-500">Cancel anytime from billing settings.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps({
  sectionId: { type: String, default: 'pricing' },
})

const bullets = [
  '14-day free trial',
  'No credit card required',
  'Reporting',
  'CRM',
  'Email campaigns',
  'Agency Planner',
]
</script>
