<template>
  <section id="reports" class="scroll-mt-24 border-t border-slate-800/80 py-20 sm:py-28">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">Reports your clients actually open.</h2>
        <p class="mt-4 text-lg text-slate-400">
          Drag-and-drop builder, cover page, table of contents, and modules for rankings, GA4, Search Console, Ads, WooCommerce, and more. One link or one PDF attachment — they get the full picture.
        </p>
      </div>

      <div class="mt-14">
        <div
          class="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/40 ring-1 ring-white/5"
        >
          <div class="flex items-center gap-2 border-b border-slate-700/80 bg-slate-950 px-4 py-3">
            <span class="h-3 w-3 rounded-full bg-red-500/70" />
            <span class="h-3 w-3 rounded-full bg-amber-400/70" />
            <span class="h-3 w-3 rounded-full bg-emerald-500/70" />
            <div class="ml-4 flex flex-1 items-center justify-center">
              <div
                class="flex max-w-md flex-1 items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900 px-3 py-1.5 text-xs text-slate-500"
              >
                <svg class="h-3.5 w-3.5 shrink-0 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span class="truncate">app.webrankingreports.com/reports/preview</span>
              </div>
            </div>
          </div>

          <div class="grid gap-0 lg:grid-cols-[200px_1fr]">
            <aside class="hidden border-r border-slate-800 bg-slate-950/80 p-4 lg:block">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pages</p>
              <ul class="mt-3 space-y-1 text-xs">
                <li class="rounded-md bg-slate-800 px-2 py-2 font-medium text-white">Cover</li>
                <li class="rounded-md px-2 py-2 text-slate-400">Summary</li>
                <li class="rounded-md px-2 py-2 text-slate-400">Rankings</li>
                <li class="rounded-md px-2 py-2 text-slate-400">Traffic</li>
                <li class="rounded-md px-2 py-2 text-slate-400">Appendix</li>
              </ul>
            </aside>

            <div class="bg-gradient-to-b from-slate-900 to-[#0f172a] p-6 sm:p-8">
              <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-emerald-400">May performance</p>
                  <h3 class="mt-1 text-xl font-bold text-white sm:text-2xl">Executive summary</h3>
                </div>
                <div class="flex gap-2">
                  <span class="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300">PDF</span>
                  <span
                    class="rounded-lg bg-gradient-to-r from-emerald-500 to-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950"
                  >
                    Scheduled
                  </span>
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="rounded-xl border border-slate-700/60 bg-slate-800/30 p-4">
                  <p class="text-xs font-medium text-slate-500">Top visibility win</p>
                  <p class="mt-2 text-lg font-semibold text-white">+34 clicks / day</p>
                  <p class="mt-1 flex items-center gap-1 text-sm font-semibold text-emerald-400">
                    <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                    From organic, page-1 expansion
                  </p>
                </div>
                <div class="rounded-xl border border-slate-700/60 bg-slate-800/30 p-4">
                  <p class="text-xs font-medium text-slate-500">Cost per lead</p>
                  <p class="mt-2 text-lg font-semibold text-white">Down 19%</p>
                  <p class="mt-1 text-sm text-slate-400">Paid + organic blend</p>
                </div>
              </div>

              <div class="mt-6 rounded-xl border border-dashed border-slate-600/80 bg-slate-950/40 p-6 text-center">
                <p class="text-sm font-medium text-slate-300">Report builder preview</p>
                <p class="mt-2 text-xs text-slate-500">
                  Drop in modules, set date ranges, save templates per client. Same tool for one site or twenty.
                </p>
                <NuxtLink
                  to="/auth/register"
                  class="mt-5 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                >
                  Build your first report
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
