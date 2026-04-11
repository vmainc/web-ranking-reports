<template>
  <section class="border-b border-surface-200 bg-white pb-16 pt-14 sm:pb-20 sm:pt-16 lg:pt-20">
    <div class="mx-auto grid max-w-6xl gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-12">
      <div class="max-w-xl">
        <h1 class="text-4xl font-bold tracking-tight text-surface-900 sm:text-5xl sm:leading-[1.1]">
          Reporting, CRM, and AI planning for digital marketing agencies.
        </h1>
        <p class="mt-5 text-lg leading-relaxed text-surface-600">
          Track rankings, manage contacts, send campaigns, and build smarter plans — all in one place.
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          <NuxtLink
            to="/auth/register"
            class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-primary-500"
          >
            Start Free
          </NuxtLink>
          <NuxtLink
            to="/auth/login"
            class="inline-flex items-center justify-center rounded-lg border border-surface-200 bg-white px-6 py-3 text-base font-semibold text-surface-800 shadow-sm transition hover:border-surface-300 hover:bg-surface-50"
          >
            Log In
          </NuxtLink>
        </div>
        <p class="mt-4 text-sm text-surface-500">14-day free trial. No credit card required.</p>
      </div>

      <!-- Product UI mock -->
      <div class="lg:justify-self-end">
        <div
          class="w-full max-w-[520px] rounded-2xl border border-surface-200 bg-white p-4 shadow-md sm:p-5"
        >
          <div class="mb-4 flex items-center justify-between border-b border-surface-100 pb-3">
            <div class="flex items-center gap-1.5" aria-hidden="true">
              <span class="h-2.5 w-2.5 rounded-full bg-surface-300" />
              <span class="h-2.5 w-2.5 rounded-full bg-surface-300" />
              <span class="h-2.5 w-2.5 rounded-full bg-surface-300" />
            </div>
            <span class="text-xs font-medium text-surface-400">Dashboard</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-xl border border-surface-200 bg-surface-50 p-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-surface-700">Reporting</span>
                <span class="h-1.5 w-8 rounded-full bg-primary-500" />
              </div>
              <div class="mt-3 space-y-2">
                <div class="h-2 w-full rounded bg-surface-200" />
                <div class="h-2 w-[85%] rounded bg-surface-200" />
                <div class="mt-3 grid grid-cols-2 gap-2">
                  <div class="h-10 rounded-lg border border-surface-200 bg-white" />
                  <div class="h-10 rounded-lg border border-surface-200 bg-white" />
                </div>
              </div>
            </div>
            <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
              <span class="text-xs font-semibold text-surface-700">CRM</span>
              <div class="mt-3 space-y-2">
                <div class="flex items-center gap-2 rounded-lg border border-surface-100 px-2 py-2">
                  <span class="h-7 w-7 shrink-0 rounded-full bg-surface-200" />
                  <div class="min-w-0 flex-1 space-y-1">
                    <div class="h-2 w-20 rounded bg-surface-200" />
                    <div class="h-1.5 w-14 rounded bg-surface-100" />
                  </div>
                </div>
                <div class="flex items-center gap-2 rounded-lg border border-surface-100 px-2 py-2">
                  <span class="h-7 w-7 shrink-0 rounded-full bg-surface-100" />
                  <div class="min-w-0 flex-1 space-y-1">
                    <div class="h-2 w-16 rounded bg-surface-200" />
                    <div class="h-1.5 w-12 rounded bg-surface-100" />
                  </div>
                </div>
              </div>
            </div>
            <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
              <span class="text-xs font-semibold text-surface-700">Email Campaigns</span>
              <div class="mt-3 rounded-lg border border-dashed border-surface-200 bg-surface-50 px-3 py-4 text-center">
                <div class="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div class="mx-auto h-2 w-24 rounded bg-surface-200" />
              </div>
            </div>
            <div class="rounded-xl border border-primary-200 bg-primary-50/80 p-4">
              <span class="text-xs font-semibold text-primary-900">Agency Planner</span>
              <p class="mt-1 text-[11px] leading-snug text-primary-800/90">Goals · Weekly plan · Next steps</p>
              <ul class="mt-3 space-y-2">
                <li class="flex items-center gap-2 text-[11px] text-primary-900">
                  <span class="h-3.5 w-3.5 shrink-0 rounded border border-primary-300 bg-white" />
                  <span class="h-2 flex-1 rounded bg-primary-200/80" />
                </li>
                <li class="flex items-center gap-2 text-[11px] text-primary-900">
                  <span class="h-3.5 w-3.5 shrink-0 rounded border border-primary-400 bg-primary-500" />
                  <span class="h-2 flex-1 rounded bg-primary-200/60" />
                </li>
                <li class="flex items-center gap-2 text-[11px] text-primary-900">
                  <span class="h-3.5 w-3.5 shrink-0 rounded border border-primary-300 bg-white" />
                  <span class="h-2 w-3/4 rounded bg-primary-200/50" />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
