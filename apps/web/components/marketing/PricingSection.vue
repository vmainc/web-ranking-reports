<template>
  <section :id="sectionId" class="border-t border-surface-200 bg-surface-50 py-20 sm:py-24">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="mx-auto max-w-lg text-center">
        <h2 class="text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">Pricing</h2>
        <p class="mt-4 text-lg text-surface-600">Choose the package that fits your reporting growth stage.</p>
      </div>

      <div class="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="plan in plans"
          :key="plan.name"
          class="relative rounded-2xl border bg-white p-6 shadow-sm"
          :class="plan.featured ? 'border-[var(--wrr-blue)] ring-2 ring-[color-mix(in_oklab,var(--wrr-blue)_25%,white)]' : 'border-surface-200'"
        >
          <span
            v-if="plan.ribbon"
            class="absolute -top-3 left-4 rounded-full bg-[var(--wrr-blue)] px-2.5 py-1 text-[11px] font-semibold text-white"
          >
            {{ plan.ribbon }}
          </span>
          <p class="text-sm font-semibold text-surface-900">{{ plan.name }}</p>
          <p class="mt-1 text-2xl font-bold text-surface-900">{{ plan.price }}</p>
          <p class="mt-1 text-xs text-surface-500">{{ plan.subtitle }}</p>
          <ul class="mt-4 space-y-1.5 text-sm text-surface-700">
            <li v-for="item in plan.features" :key="`${plan.name}-${item}`">• {{ item }}</li>
          </ul>
          <p v-if="plan.note" class="mt-3 text-xs text-surface-500">{{ plan.note }}</p>
          <NuxtLink
            :to="plan.ctaTo"
            class="mt-5 flex w-full items-center justify-center rounded-lg py-2.5 text-sm font-semibold transition"
            :class="
              plan.name === 'Free'
                ? 'border border-surface-200 text-surface-700 hover:bg-surface-50'
                : 'bg-[var(--wrr-blue)] text-white hover:opacity-95'
            "
          >
            {{ plan.ctaLabel }}
          </NuxtLink>
        </article>
      </div>

      <div class="mt-8 text-center">
        <p class="text-sm text-surface-600">Cancel anytime. Billing handled securely by Stripe.</p>
        <p class="mt-2 text-sm font-medium text-surface-700">
          Need more sites or keywords? Agency is built for scaling client reporting.
        </p>
        <p class="mt-1 text-xs text-surface-500">14-day free trial available on paid plans.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps({
  sectionId: { type: String, default: 'pricing' },
})

const plans = [
  {
    name: 'Free',
    price: '$0',
    subtitle: 'Start with WRR-branded reports',
    ribbon: '',
    featured: false,
    features: [
      '1 site',
      '5 keywords',
      '10 CRM contacts',
      '1 WRR-branded report/month',
      'GA4, Search Console, Google Ads basics',
    ],
    note: 'Free reports include Web Ranking Reports branding.',
    ctaLabel: 'Start Free',
    ctaTo: '/auth/register',
  },
  {
    name: 'Starter',
    price: '$19.99/mo',
    subtitle: 'Best for Solo Sites',
    ribbon: 'Best for Solo Sites',
    featured: false,
    features: [
      '1 site',
      '25 keywords',
      '100 CRM contacts',
      '10 reports/month',
      'Remove WRR branding',
      'Weekly reports + core integrations',
    ],
    note: '',
    ctaLabel: 'Upgrade to Starter',
    ctaTo: '/auth/register?plan=starter',
  },
  {
    name: 'Growth',
    price: '$49/mo',
    subtitle: 'Most Popular',
    ribbon: 'Most Popular',
    featured: true,
    features: [
      '3 sites',
      '100 keywords',
      '500 CRM contacts',
      '50 reports/month',
      'Custom branding + scheduled reports',
      'Priority data sync',
    ],
    note: '',
    ctaLabel: 'Upgrade to Growth',
    ctaTo: '/auth/register?plan=growth',
  },
  {
    name: 'Agency',
    price: '$99/mo',
    subtitle: 'Best for Client Reporting',
    ribbon: 'Best for Client Reporting',
    featured: false,
    features: [
      '10 sites',
      '500 keywords',
      '2,000 CRM contacts',
      '200 reports/month',
      'White-label reports + client-ready exports',
      'Agency dashboard at scale',
    ],
    note: '',
    ctaLabel: 'Upgrade to Agency',
    ctaTo: '/auth/register?plan=agency',
  },
]
</script>
