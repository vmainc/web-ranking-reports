<script setup lang="ts">
useHead({
  htmlAttrs: { class: '' },
  bodyAttrs: { class: 'bg-white text-surface-800' },
})
</script>

<template>
  <div class="min-h-screen bg-white text-surface-800 antialiased">
    <MarketingNav />
    <main>
      <slot />
    </main>
    <Footer />
  </div>
</template>

<style>
:root {
  --wrr-navy: #071f57;
  --wrr-blue: #2563eb;
  --wrr-green: #22c55e;
}
</style>
