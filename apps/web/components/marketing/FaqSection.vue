<template>
  <section class="border-t border-surface-200 bg-white py-20 sm:py-24">
    <div class="mx-auto max-w-3xl px-4 sm:px-6">
      <h2 class="text-center text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">FAQ</h2>
      <p class="mx-auto mt-4 max-w-xl text-center text-lg text-surface-600">Common questions, clear answers.</p>

      <div class="mt-12 divide-y divide-surface-200 rounded-2xl border border-surface-200 bg-white">
        <details v-for="item in faqs" :key="item.q" class="group px-5 py-4 sm:px-6">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-semibold text-surface-900">
            {{ item.q }}
            <span class="text-surface-400 transition group-open:rotate-180" aria-hidden="true">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </summary>
          <p class="mt-3 text-sm leading-relaxed text-surface-600">{{ item.a }}</p>
        </details>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const faqs = [
  {
    q: 'Do I need a credit card?',
    a: 'No. Start your 14-day trial without entering a card. You only add payment if you subscribe after the trial.',
  },
  {
    q: 'How does pricing work?',
    a: '$19.99 per site per month. Each client site can have its own subscription. Upgrade or cancel from in-app billing.',
  },
  {
    q: 'Is it per user or per site?',
    a: 'Per site. Your team shares the workspace; you don’t pay per seat for the core product.',
  },
  {
    q: 'Can I manage multiple sites?',
    a: 'Yes. Add as many sites as you need—each with its own reporting, CRM context, and billing.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from billing settings whenever you like. You keep access through the period you’ve already paid for.',
  },
]
</script>

<style scoped>
details summary::-webkit-details-marker {
  display: none;
}
</style>
