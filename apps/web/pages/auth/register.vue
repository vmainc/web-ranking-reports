<template>
  <NuxtLayout name="auth">
    <div class="rounded-2xl border border-surface-200 bg-white p-8 shadow-card">
      <h1 class="mb-2 text-xl font-semibold text-surface-900">Sign up</h1>
      <p class="mb-6 text-sm text-surface-500">New account creation is currently disabled.</p>
      <p class="text-sm text-surface-600">
        If you need access, please contact your administrator.
      </p>
      <NuxtLink
        to="/auth/login"
        class="mt-6 inline-block w-full rounded-lg bg-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-primary-500"
      >
        Back to Sign in
      </NuxtLink>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })
</script>
