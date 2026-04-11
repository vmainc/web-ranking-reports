<template>
  <section class="border-t border-surface-200 bg-surface-50 py-16 sm:py-20">
    <div class="mx-auto max-w-3xl px-4 text-center sm:px-6">
      <h2 class="text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
        Start building smarter, more organized marketing workflows.
      </h2>
      <p class="mx-auto mt-4 max-w-xl text-lg text-surface-600">
        14-day free trial · No credit card required
      </p>
      <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
        <NuxtLink
          to="/auth/register"
          class="inline-flex rounded-lg bg-primary-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-500"
        >
          Start Free
        </NuxtLink>
        <NuxtLink
          to="/auth/login"
          class="inline-flex rounded-lg border border-surface-200 bg-white px-8 py-3.5 text-base font-semibold text-surface-800 shadow-sm transition hover:border-surface-300 hover:bg-white"
        >
          Log In
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
