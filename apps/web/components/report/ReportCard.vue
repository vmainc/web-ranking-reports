<template>
  <div
    class="report-card overflow-hidden rounded-lg border border-surface-200 bg-white print:shadow-none"
    :class="{ 'report-mode': reportMode }"
  >
    <div class="border-b border-surface-100 px-4 py-3">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="font-semibold text-surface-900">{{ title }}</h3>
          <p v-if="subtitle" class="mt-0.5 text-sm text-surface-500">{{ subtitle }}</p>
        </div>
        <div v-if="!reportMode && showMenu" class="relative">
          <button
            type="button"
            class="rounded p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600"
            aria-label="Widget menu"
            @click.stop="menuOpen = !menuOpen"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1  0 010 2z" />
            </svg>
          </button>
          <div
            v-if="menuOpen"
            class="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-surface-200 bg-white py-1 shadow-lg"
            @click.stop
          >
            <button
              type="button"
              class="w-full px-3 py-2 text-left text-sm text-surface-700 hover:bg-surface-50"
              @click="emit('move-up'); menuOpen = false"
            >
              Move up
            </button>
            <button
              type="button"
              class="w-full px-3 py-2 text-left text-sm text-surface-700 hover:bg-surface-50"
              @click="emit('move-down'); menuOpen = false"
            >
              Move down
            </button>
            <button
              type="button"
              class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              @click="emit('remove'); menuOpen = false"
            >
              Remove widget
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="p-4" :style="chartHeight ? { minHeight: chartHeight } : undefined">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    reportMode?: boolean
    showMenu?: boolean
    chartHeight?: string
  }>(),
  { subtitle: '', reportMode: false, showMenu: true, chartHeight: '280px' }
)
const emit = defineEmits<{ (e: 'remove'): void; (e: 'move-up'): void; (e: 'move-down'): void }>()
const menuOpen = ref(false)
function closeMenu() {
  menuOpen.value = false
}
onMounted(() => {
  document.addEventListener('click', closeMenu)
})
onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})
</script>

<style scoped>
.report-card.report-mode {
  break-inside: avoid;
  page-break-inside: avoid;
}
</style>
