<template>
  <section class="relative overflow-hidden pb-20 pt-12 sm:pb-28 sm:pt-16 lg:pt-20">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-emerald-500/12 blur-[100px]" />
      <div class="absolute -right-24 top-40 h-[360px] w-[360px] rounded-full bg-sky-500/15 blur-[90px]" />
      <div class="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-[80px]" />
    </div>

    <div class="relative mx-auto grid max-w-6xl gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">Client reporting that earns its keep</p>
        <h1 class="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl sm:leading-[1.08] lg:text-[3.25rem]">
          Know if rankings, traffic, and conversions are actually moving.
        </h1>
        <p class="mt-5 max-w-xl text-lg leading-relaxed text-slate-400">
          Pull rank data, GA4, Search Console, and Ads into one place. Ship PDFs on a schedule. No fluff — just numbers your clients can act on.
        </p>
        <div class="mt-9 flex flex-wrap items-center gap-3">
          <NuxtLink
            to="/auth/register"
            class="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-7 py-3.5 text-base font-semibold text-slate-950 shadow-xl shadow-emerald-500/25 transition hover:brightness-110"
          >
            Start free — 14 days
          </NuxtLink>
          <a
            href="#reports"
            class="inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-800/50 px-6 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:border-slate-500 hover:bg-slate-800"
          >
            See report output
          </a>
        </div>
        <p class="mt-4 text-sm text-slate-500">No card to start. Cancel anytime.</p>
      </div>

      <!-- Dashboard-style visual -->
      <div class="relative lg:justify-self-end">
        <div
          class="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/80 p-5 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-sm sm:p-6"
        >
          <div class="mb-5 flex items-center justify-between border-b border-slate-700/80 pb-4">
            <div class="flex items-center gap-2" aria-hidden="true">
              <span class="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <span class="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span class="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span class="text-xs font-medium text-slate-500">Live workspace</span>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <div class="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 sm:col-span-1">
              <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Avg. position</p>
              <p class="mt-2 text-2xl font-bold tabular-nums text-white">4.2</p>
              <p class="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                Up 1.8 vs last month
              </p>
            </div>
            <div class="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
              <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Sessions</p>
              <p class="mt-2 text-2xl font-bold tabular-nums text-white">12.4k</p>
              <p class="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                +22%
              </p>
            </div>
            <div class="col-span-2 rounded-xl border border-slate-700/60 bg-slate-800/30 p-4 sm:col-span-1">
              <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Conversions</p>
              <p class="mt-2 text-2xl font-bold tabular-nums text-white">186</p>
              <p class="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                +31 vs prior period
              </p>
            </div>
          </div>

          <!-- Animated mini chart -->
          <div class="mt-5 rounded-xl border border-slate-700/60 bg-slate-950/50 p-4">
            <div class="mb-3 flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-300">Traffic vs. goal</span>
              <span class="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">On track</span>
            </div>
            <div class="relative h-28 w-full">
              <svg class="h-full w-full overflow-visible" viewBox="0 0 320 100" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="dark-hero-line" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#34d399" />
                    <stop offset="100%" stop-color="#38bdf8" />
                  </linearGradient>
                  <linearGradient id="dark-hero-area" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#34d399" stop-opacity="0.25" />
                    <stop offset="100%" stop-color="#34d399" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,85 L40,78 L80,82 L120,55 L160,48 L200,35 L240,42 L280,22 L320,18 L320,100 L0,100 Z"
                  fill="url(#dark-hero-area)"
                  class="wrr-hero-fill"
                />
                <path
                  d="M0,85 L40,78 L80,82 L120,55 L160,48 L200,35 L240,42 L280,22 L320,18"
                  fill="none"
                  stroke="url(#dark-hero-line)"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="wrr-hero-line"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
@keyframes wrr-hero-draw {
  from {
    stroke-dashoffset: 400;
  }
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes wrr-hero-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.wrr-hero-line {
  stroke-dasharray: 400;
  stroke-dashoffset: 400;
  animation: wrr-hero-draw 1.8s ease-out 0.3s forwards;
}
.wrr-hero-fill {
  opacity: 0;
  animation: wrr-hero-fade 0.8s ease-out 1.2s forwards;
}
</style>
