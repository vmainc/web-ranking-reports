<template>
  <section id="pricing" class="scroll-mt-24 border-t border-slate-800/80 bg-slate-950/40 py-20 sm:py-28">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">Per-site pricing. Scale when you win more clients.</h2>
        <p class="mt-4 text-lg text-slate-400">
          Each plan includes a site quota and keyword limits — add capacity as you grow. Start free, upgrade when you’re ready to remove branding or automate delivery.
        </p>
      </div>

      <div class="mt-14 grid gap-6 md:grid-cols-3">
        <article
          v-for="tier in tiers"
          :key="tier.name"
          class="flex flex-col rounded-2xl border p-8 shadow-xl transition"
          :class="
            tier.featured
              ? 'border-emerald-500/50 bg-gradient-to-b from-slate-900 to-slate-900/80 ring-2 ring-emerald-500/30'
              : 'border-slate-700/80 bg-slate-900/50 ring-1 ring-white/5'
          "
        >
          <div v-if="tier.badge" class="-mt-2 mb-2">
            <span class="inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">{{ tier.badge }}</span>
          </div>
          <h3 class="text-lg font-bold text-white">{{ tier.name }}</h3>
          <p class="mt-3 text-4xl font-bold tabular-nums text-white">{{ tier.price }}</p>
          <p class="mt-1 text-sm text-slate-400">{{ tier.sites }}</p>
          <ul class="mt-6 flex-1 space-y-3 text-sm text-slate-300">
            <li v-for="f in tier.features" :key="f" class="flex gap-2">
              <span class="mt-0.5 text-emerald-400" aria-hidden="true">✓</span>
              <span>{{ f }}</span>
            </li>
          </ul>
          <NuxtLink
            :to="tier.ctaTo"
            class="mt-8 flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold transition"
            :class="
              tier.featured
                ? 'bg-gradient-to-r from-emerald-500 to-sky-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110'
                : 'border border-slate-600 bg-slate-800/80 text-white hover:border-slate-500'
            "
          >
            {{ tier.cta }}
          </NuxtLink>
        </article>
      </div>

      <p class="mt-10 text-center text-sm text-slate-500">
        Full plan grid and trials on the
        <NuxtLink to="/pricing" class="font-semibold text-emerald-400 underline-offset-2 hover:underline">pricing page</NuxtLink>
        . Billing via Stripe.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
const tiers = [
  {
    name: 'Solo',
    price: '$19.99/mo',
    sites: '1 site · 25 keywords',
    badge: '',
    featured: false,
    features: ['Remove WRR branding on exports', '10 reports / month', 'GA4, GSC, core integrations', 'Email support'],
    cta: 'Start with Solo',
    ctaTo: '/auth/register?plan=starter',
  },
  {
    name: 'Growth',
    price: '$49/mo',
    sites: '3 sites · 100 keywords',
    badge: 'Most teams start here',
    featured: true,
    features: ['Custom branding + scheduled PDFs', '50 reports / month', 'Priority data sync', 'Higher CRM limits'],
    cta: 'Start Growth trial',
    ctaTo: '/auth/register?plan=growth',
  },
  {
    name: 'Agency',
    price: '$99/mo',
    sites: '10 sites · 500 keywords',
    badge: '',
    featured: false,
    features: ['White-label ready', '200 reports / month', 'Scale contacts & campaigns', 'Built for client portfolios'],
    cta: 'Go Agency',
    ctaTo: '/auth/register?plan=agency',
  },
]
</script>
