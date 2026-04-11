<template>
  <section class="bg-white py-20 sm:py-24">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <p class="text-sm font-semibold uppercase tracking-wide text-primary-600">Agency Planner</p>
          <h2 class="mt-3 text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
            Don’t just track data. Know what to do next.
          </h2>
          <p class="mt-4 text-lg text-surface-600">
            Agency Planner uses AI to suggest goals, create execution plans, and help your agency grow faster—without another generic strategy doc.
          </p>
          <ul class="mt-8 space-y-3 text-surface-700">
            <li class="flex gap-3">
              <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary-200 bg-primary-50 text-xs font-bold text-primary-700">1</span>
              <span><strong class="text-surface-900">Suggest goals</strong> based on your agency context and constraints.</span>
            </li>
            <li class="flex gap-3">
              <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary-200 bg-primary-50 text-xs font-bold text-primary-700">2</span>
              <span><strong class="text-surface-900">Create execution plans</strong> you can assign and ship week by week.</span>
            </li>
            <li class="flex gap-3">
              <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary-200 bg-primary-50 text-xs font-bold text-primary-700">3</span>
              <span><strong class="text-surface-900">Grow faster</strong> with quick wins and a clear roadmap—not guesswork.</span>
            </li>
          </ul>
          <div class="mt-8">
            <NuxtLink
              to="/auth/register"
              class="inline-flex rounded-lg bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
            >
              Start Free
            </NuxtLink>
          </div>
        </div>
        <div class="rounded-2xl border border-surface-200 bg-surface-50 p-6 sm:p-8">
          <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between border-b border-surface-100 pb-3">
              <span class="text-sm font-semibold text-surface-900">Weekly plan</span>
              <span class="rounded-md bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-600">AI</span>
            </div>
            <p class="mt-4 text-xs font-semibold uppercase tracking-wide text-surface-500">This week</p>
            <ul class="mt-3 space-y-2">
              <li class="flex items-start gap-2 rounded-lg border border-surface-100 bg-surface-50 px-3 py-2">
                <span class="mt-0.5 h-4 w-4 shrink-0 rounded border border-primary-500 bg-primary-500" aria-hidden="true" />
                <span class="text-sm text-surface-800">Publish case study + promote to warm leads</span>
              </li>
              <li class="flex items-start gap-2 rounded-lg border border-surface-100 bg-white px-3 py-2">
                <span class="mt-0.5 h-4 w-4 shrink-0 rounded border border-surface-300" aria-hidden="true" />
                <span class="text-sm text-surface-800">Audit top 5 client sites for quick SEO wins</span>
              </li>
              <li class="flex items-start gap-2 rounded-lg border border-surface-100 bg-white px-3 py-2">
                <span class="mt-0.5 h-4 w-4 shrink-0 rounded border border-surface-300" aria-hidden="true" />
                <span class="text-sm text-surface-800">Standardize monthly reporting template</span>
              </li>
            </ul>
            <p class="mt-5 text-xs font-semibold uppercase tracking-wide text-surface-500">Goals</p>
            <div class="mt-2 space-y-2">
              <div class="rounded-lg border border-surface-100 bg-surface-50 px-3 py-2 text-sm text-surface-800">2 net-new retainers in 90 days</div>
              <div class="rounded-lg border border-surface-100 bg-surface-50 px-3 py-2 text-sm text-surface-800">Cut reporting time by 40%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
