<template>
  <footer class="border-t border-slate-800 bg-slate-950 py-14">
    <div class="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div>
        <NuxtLink to="/" class="inline-flex items-center gap-2 font-semibold text-white">
          <img src="/images/branding/wrr-logo.svg" class="h-7 w-7" width="28" height="28" alt="" />
          Web Ranking Reports
        </NuxtLink>
        <p class="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
          Rankings, traffic, and client-ready reports — without the busywork.
        </p>
      </div>
      <nav class="flex flex-wrap gap-x-10 gap-y-3 text-sm font-medium text-slate-400" aria-label="Footer">
        <NuxtLink to="/features" class="transition hover:text-emerald-400">Features</NuxtLink>
        <NuxtLink to="/pricing" class="transition hover:text-emerald-400">Pricing</NuxtLink>
        <NuxtLink to="/classic-home" class="transition hover:text-emerald-400">Platform overview</NuxtLink>
        <NuxtLink to="/privacy" class="transition hover:text-emerald-400">Privacy</NuxtLink>
        <NuxtLink to="/auth/login" class="transition hover:text-emerald-400">Log in</NuxtLink>
      </nav>
    </div>
    <div class="mx-auto mt-12 max-w-6xl border-t border-slate-800 px-4 pt-8 sm:px-6">
      <p class="text-center text-xs text-slate-600">© {{ year }} Web Ranking Reports. All rights reserved.</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>
