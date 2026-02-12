<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-surface-50 px-4">
    <div class="w-full max-w-md">
      <NuxtLink to="/" class="mb-8 flex justify-center font-semibold text-primary-600">
        Web Ranking Reports
      </NuxtLink>
      <slot />
    </div>
  </div>
</template>
