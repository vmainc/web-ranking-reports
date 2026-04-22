<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'

const props = defineProps<{
  module: Extract<ReportModule, { type: 'image_branding' }>
}>()

const alignClass = computed(() => {
  switch (props.module.settings.alignment) {
    case 'left':
      return 'text-left'
    case 'right':
      return 'text-right'
    default:
      return 'text-center'
  }
})
</script>

<template>
  <div :class="['space-y-3', alignClass]">
    <div
      class="mx-auto flex h-32 max-w-xl items-center justify-center rounded-xl border border-dashed border-surface-200 bg-surface-100/80 text-sm text-surface-500"
      :class="module.settings.alignment === 'left' ? 'mr-auto' : module.settings.alignment === 'right' ? 'ml-auto' : ''"
    >
      <img v-if="module.settings.imageUrl" :src="module.settings.imageUrl" alt="" class="max-h-full max-w-full rounded-lg object-contain" />
      <span v-else>Image placeholder · add URL in settings</span>
    </div>
    <h3 class="text-lg font-bold tracking-tight text-surface-900">{{ module.settings.headline }}</h3>
    <p class="text-sm text-surface-600">{{ module.settings.subheadline }}</p>
  </div>
</template>
