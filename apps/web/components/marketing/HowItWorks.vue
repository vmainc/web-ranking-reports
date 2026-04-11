<template>
  <section class="border-y border-surface-200 bg-surface-50 py-20 sm:py-24">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">How it works</h2>
        <p class="mt-4 text-lg text-surface-600">Three steps. No complexity.</p>
      </div>
      <ol class="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
        <li v-for="(step, i) in steps" :key="step.title" class="relative text-center md:text-left">
          <div
            class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-surface-200 bg-white text-lg font-bold text-primary-600 shadow-sm md:mx-0"
            :aria-label="`Step ${i + 1}`"
          >
            {{ i + 1 }}
          </div>
          <h3 class="mt-5 text-lg font-semibold text-surface-900">{{ step.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-surface-600">{{ step.body }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
const steps = [
  {
    title: 'Add your sites',
    body: 'Create a workspace for each client site. Connect integrations when you’re ready.',
  },
  {
    title: 'Track performance and manage contacts',
    body: 'See rankings and reporting alongside CRM notes, stages, and follow-ups.',
  },
  {
    title: 'Take action with reports, campaigns, and AI plans',
    body: 'Ship client-ready reports, send campaigns, and use Agency Planner to prioritize what’s next.',
  },
]
</script>
