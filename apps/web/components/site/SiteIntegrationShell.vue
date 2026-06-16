<template>
  <div
    :class="[
      'relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen pb-20 pt-6 font-inter sm:pt-8',
      isDark ? 'dashboard-vibrant bg-[#0f172a]' : 'site-workspace-light bg-surface-50',
    ]"
  >
    <div class="mx-auto w-full px-4 sm:px-6" :class="maxWidthClass">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const { isDark } = useAppTheme()

const props = withDefaults(
  defineProps<{
    /** Tailwind max-width token (e.g. 7xl, 5xl). */
    maxWidth?: '7xl' | '6xl' | '5xl' | '4xl' | '3xl'
  }>(),
  { maxWidth: '7xl' },
)

const maxWidthClass = computed(() => {
  const map = {
    '7xl': 'max-w-7xl',
    '6xl': 'max-w-6xl',
    '5xl': 'max-w-5xl',
    '4xl': 'max-w-4xl',
    '3xl': 'max-w-3xl',
  } as const
  return map[props.maxWidth]
})
</script>
