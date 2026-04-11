<template>
  <section class="border-t border-surface-200 bg-white py-20 sm:py-24">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="mx-auto max-w-3xl text-center">
        <h2 class="text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">More than reporting</h2>
        <p class="mt-4 text-lg text-surface-600">
          Organize accounts, communicate with contacts, and execute—the same platform your team already works in.
        </p>
      </div>

      <div class="mt-14 grid gap-6 lg:grid-cols-3">
        <article
          v-for="col in columns"
          :key="col.title"
          class="flex flex-col rounded-2xl border border-surface-200 bg-surface-50/50 p-6 transition hover:border-primary-200 hover:bg-white hover:shadow-card"
        >
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-primary-600 shadow-sm" v-html="col.icon" />
          <h3 class="mt-4 text-lg font-semibold text-surface-900">{{ col.title }}</h3>
          <p class="mt-2 flex-1 text-sm leading-relaxed text-surface-600">{{ col.body }}</p>
          <p class="mt-4 text-xs font-medium text-primary-600">{{ col.tagline }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const columns = [
  {
    title: 'Reports',
    body: 'Pull performance into views your clients understand. Less manual assembly, fewer “can you send an update?” threads.',
    tagline: 'Clarity for stakeholders',
    icon: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>',
  },
  {
    title: 'CRM',
    body: 'Keep leads and clients structured: stages, notes, next steps. So handoffs don’t live in one person’s inbox.',
    tagline: 'Execution-ready pipeline',
    icon: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>',
  },
  {
    title: 'Email campaigns',
    body: 'Send focused campaigns to the contacts you already track—announcements, nurture, re-engagement—without exporting CSVs.',
    tagline: 'Reach out with context',
    icon: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>',
  },
]
</script>
