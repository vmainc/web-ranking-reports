<template>
  <section :id="sectionId" class="bg-white py-20 sm:py-24">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">Everything in one workspace</h2>
        <p class="mt-4 text-lg text-surface-600">
          Built for agencies that need reporting, relationships, and execution—not another stack of tools.
        </p>
      </div>
      <ul class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <li
          v-for="item in features"
          :key="item.title"
          class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm"
        >
          <span
            class="flex h-10 w-10 items-center justify-center rounded-lg border border-surface-100 bg-surface-50 text-primary-600"
            v-html="item.icon"
          />
          <h3 class="mt-4 text-lg font-semibold text-surface-900">{{ item.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-surface-600">{{ item.description }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps({
  sectionId: { type: String, default: 'features' },
})

const features = [
  {
    title: 'Reporting',
    description: 'Clear snapshots of site performance so you and your clients see what matters.',
    icon: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>',
  },
  {
    title: 'Rank Tracking',
    description: 'Monitor keyword movement over time and spot trends before they become surprises.',
    icon: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>',
  },
  {
    title: 'CRM',
    description: 'Keep leads and contacts organized next to the sites you manage.',
    icon: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>',
  },
  {
    title: 'Email Campaigns',
    description: 'Send simple campaigns to your contacts without exporting lists or switching tools.',
    icon: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>',
  },
  {
    title: 'Agency Planner',
    description: 'AI-powered goals and execution plans so your team knows what to do next.',
    icon: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>',
  },
  {
    title: 'Site-Based Billing',
    description: 'Simple pricing that scales with your work—per site, not per seat.',
    icon: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
  },
]
</script>
