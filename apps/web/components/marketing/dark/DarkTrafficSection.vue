<template>
  <section id="traffic" class="scroll-mt-24 border-t border-slate-800/80 bg-slate-950/50 py-20 sm:py-28">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div class="order-2 lg:order-1">
          <div
            class="rounded-2xl border border-slate-700/80 bg-[#0f172a] p-6 shadow-2xl shadow-black/30 ring-1 ring-cyan-500/10"
          >
            <div class="flex items-center justify-between border-b border-slate-700/60 pb-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-cyan-400">Acquisition</p>
                <p class="mt-1 text-sm text-slate-400">GA4 · last 28 days</p>
              </div>
              <span class="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-400">+18.4%</span>
            </div>
            <div class="mt-6 grid grid-cols-3 gap-3">
              <div class="rounded-xl border border-slate-700/60 bg-slate-900/80 p-3 text-center">
                <p class="text-[10px] font-medium uppercase text-slate-500">Organic</p>
                <p class="mt-1 text-lg font-bold text-white">8.1k</p>
                <p class="mt-0.5 flex items-center justify-center gap-0.5 text-[11px] font-semibold text-emerald-400">
                  <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
                  12%
                </p>
              </div>
              <div class="rounded-xl border border-slate-700/60 bg-slate-900/80 p-3 text-center">
                <p class="text-[10px] font-medium uppercase text-slate-500">Direct</p>
                <p class="mt-1 text-lg font-bold text-white">2.4k</p>
                <p class="mt-0.5 flex items-center justify-center gap-0.5 text-[11px] font-semibold text-emerald-400">
                  <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
                  4%
                </p>
              </div>
              <div class="rounded-xl border border-slate-700/60 bg-slate-900/80 p-3 text-center">
                <p class="text-[10px] font-medium uppercase text-slate-500">Paid</p>
                <p class="mt-1 text-lg font-bold text-white">1.9k</p>
                <p class="mt-0.5 flex items-center justify-center gap-0.5 text-[11px] font-semibold text-amber-400">flat</p>
              </div>
            </div>
            <div class="mt-6 h-36 w-full">
              <svg class="h-full w-full" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="traffic-a" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#22d3ee" />
                    <stop offset="50%" stop-color="#a78bfa" />
                    <stop offset="100%" stop-color="#34d399" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,95 Q50,90 100,70 T200,55 T300,40 T400,25 L400,120 L0,120 Z"
                  fill="url(#traffic-a)"
                  fill-opacity="0.15"
                />
                <path
                  d="M0,95 Q50,90 100,70 T200,55 T300,40 T400,25"
                  fill="none"
                  stroke="url(#traffic-a)"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  class="wrr-traffic-line"
                />
              </svg>
            </div>
            <p class="mt-2 text-center text-[11px] text-slate-500">Illustrative — your charts use your connected properties.</p>
          </div>
        </div>

        <div class="order-1 lg:order-2">
          <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">Traffic intelligence that ties to revenue.</h2>
          <p class="mt-4 text-lg text-slate-400">
            Hook up GA4, Search Console, and Google Ads. See sessions, landing pages, and channel mix next to rank movement — so you can explain why leads went up or down, not just that they did.
          </p>
          <ul class="mt-8 space-y-4">
            <li class="flex gap-3">
              <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
              </span>
              <div>
                <p class="font-semibold text-white">Same date range everywhere</p>
                <p class="text-sm text-slate-500">Compare periods once; every widget respects it.</p>
              </div>
            </li>
            <li class="flex gap-3">
              <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
              </span>
              <div>
                <p class="font-semibold text-white">Conversion context</p>
                <p class="text-sm text-slate-500">Spot landing pages that earn traffic but waste intent.</p>
              </div>
            </li>
            <li class="flex gap-3">
              <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-fuchsia-500/15 text-fuchsia-400">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
              </span>
              <div>
                <p class="font-semibold text-white">Client-ready exports</p>
                <p class="text-sm text-slate-500">PDF on a schedule or on demand — your call.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
@keyframes wrr-traffic-draw {
  from {
    stroke-dashoffset: 500;
  }
  to {
    stroke-dashoffset: 0;
  }
}
.wrr-traffic-line {
  stroke-dasharray: 500;
  stroke-dashoffset: 500;
  animation: wrr-traffic-draw 2s ease-out 0.2s forwards;
}
</style>
