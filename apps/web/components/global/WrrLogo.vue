<template>
  <div class="flex items-center gap-2">
    <img :src="logoSrc" alt="WRR logo" :class="sizeClass" />

    <span v-if="variant === 'full'" class="font-semibold text-gray-900">
      Web Ranking Reports
    </span>

    <span v-if="variant === 'compact'" class="font-semibold text-gray-900">
      WRR
    </span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  variant: { type: String, default: 'icon' }, // icon | compact | full
  size: { type: String, default: 'md' }, // sm | md | lg
})

const sizeClass = computed(() => {
  if (props.size === 'sm') return 'w-6 h-6'
  if (props.size === 'lg') return 'w-12 h-12'
  return 'w-8 h-8'
})

const logoSrc = '/images/branding/wrr-logo.svg'
</script>

