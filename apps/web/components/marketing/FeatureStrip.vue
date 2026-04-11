<template>
  <section class="border-b border-surface-200 bg-surface-50 py-6">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        <li v-for="item in items" :key="item.label" class="flex items-center gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-white text-primary-600 shadow-sm"
            aria-hidden="true"
            v-html="item.icon"
          />
          <span class="text-sm font-semibold text-surface-800">{{ item.label }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
const items = [
  {
    label: 'Track rankings',
    icon: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>',
  },
  {
    label: 'Manage contacts',
    icon: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>',
  },
  {
    label: 'Send campaigns',
    icon: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>',
  },
  {
    label: 'Plan your agency growth',
    icon: '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002-2h2a2 2 0 012 2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>',
  },
]
</script>
