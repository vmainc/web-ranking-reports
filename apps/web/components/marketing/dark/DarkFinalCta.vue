<template>
  <section class="border-t border-slate-800 py-20 sm:py-24">
    <div class="mx-auto max-w-4xl px-4 text-center sm:px-6">
      <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">Stop stitching screenshots into decks.</h2>
      <p class="mt-4 text-lg text-slate-400">
        One workspace: rankings, analytics, and scheduled reports. Get your first site connected in minutes.
      </p>
      <div class="mt-10 flex flex-wrap justify-center gap-3">
        <NuxtLink
          to="/auth/register"
          class="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-8 py-3.5 text-base font-semibold text-slate-950 shadow-xl shadow-emerald-500/25 transition hover:brightness-110"
        >
          Create free account
        </NuxtLink>
        <NuxtLink
          to="/auth/login"
          class="inline-flex items-center justify-center rounded-xl border border-slate-600 px-8 py-3.5 text-base font-semibold text-white transition hover:border-slate-500 hover:bg-slate-800/50"
        >
          Log in
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
