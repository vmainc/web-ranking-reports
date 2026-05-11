<template>
  <section id="rankings" class="scroll-mt-24 border-t border-slate-800/80 py-20 sm:py-28">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="max-w-2xl">
        <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">Ranking movement, without the spreadsheet.</h2>
        <p class="mt-4 text-lg text-slate-400">
          Track keywords across Google (and Bing where you wire it). See who gained, who slipped, and which URLs rank — in one view your client can read in under a minute.
        </p>
      </div>

      <div class="mt-14 grid gap-6 lg:grid-cols-2 lg:gap-10">
        <article class="rounded-2xl border border-slate-700/80 bg-slate-900/50 p-8 shadow-xl shadow-black/20 ring-1 ring-white/5">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-sky-400">Position trend</h3>
          <p class="mt-2 text-2xl font-bold text-white">Tracked keywords</p>
          <div class="mt-8 flex h-48 items-end justify-between gap-2 border-b border-slate-700/60 pb-0">
            <div
              v-for="(h, i) in barHeights"
              :key="i"
              class="wrr-rank-bar flex-1 rounded-t-md bg-gradient-to-t from-sky-600/40 to-emerald-400/90"
              :style="{ height: `${h}%`, animationDelay: `${i * 0.08}s` }"
            />
          </div>
          <div class="mt-3 flex justify-between text-[11px] font-medium text-slate-500">
            <span>Week 1</span>
            <span>Week 4</span>
            <span>Week 8</span>
            <span>Now</span>
          </div>
          <ul class="mt-8 space-y-3 text-sm">
            <li class="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/40 px-4 py-3">
              <span class="font-medium text-slate-200">“emergency plumber austin”</span>
              <span class="flex items-center gap-1 font-semibold text-emerald-400">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                #14 → #6
              </span>
            </li>
            <li class="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/40 px-4 py-3">
              <span class="font-medium text-slate-200">“water heater repair”</span>
              <span class="flex items-center gap-1 font-semibold text-emerald-400">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                #22 → #11
              </span>
            </li>
          </ul>
        </article>

        <article class="rounded-2xl border border-slate-700/80 bg-slate-900/50 p-8 shadow-xl shadow-black/20 ring-1 ring-white/5">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-fuchsia-400">What you ship</h3>
          <p class="mt-2 text-xl font-bold text-white">Reports that say what changed</p>
          <p class="mt-3 text-slate-400">
            Schedule PDFs. White-label when your plan allows. Your logo on the cover — not ours — so it looks like your agency did the work (because it did).
          </p>
          <div class="mt-8 grid gap-4 sm:grid-cols-2">
            <div class="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p class="text-xs font-semibold text-emerald-400">Win rate</p>
              <p class="mt-2 text-3xl font-bold text-white">68%</p>
              <p class="mt-1 text-xs text-slate-500">Keywords up period over period</p>
            </div>
            <div class="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
              <p class="text-xs font-semibold text-sky-400">New page-1</p>
              <p class="mt-2 text-3xl font-bold text-white">+12</p>
              <p class="mt-1 text-xs text-slate-500">Terms hitting first page</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const barHeights = [38, 44, 41, 52, 48, 61, 58, 72, 68, 85, 79, 92]
</script>

<style scoped>
.wrr-rank-bar {
  transform-origin: bottom;
  animation: wrr-bar-rise 0.9s ease-out both;
}
@keyframes wrr-bar-rise {
  from {
    transform: scaleY(0);
    opacity: 0.5;
  }
  to {
    transform: scaleY(1);
    opacity: 1;
  }
}
</style>
