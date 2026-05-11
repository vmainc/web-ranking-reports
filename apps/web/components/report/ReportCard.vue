<template>
  <div
    class="report-card overflow-hidden rounded-lg border print:shadow-none"
    :class="[
      vibrant
        ? 'rounded-2xl border-slate-700/70 bg-slate-900/50 text-slate-100 shadow-lg shadow-black/20 ring-1 ring-white/[0.04]'
        : 'rounded-lg border-surface-200 bg-white',
      { 'report-mode': reportMode, 'report-card-print-keep': printKeepTogether },
    ]"
  >
    <!-- In report mode the page already provides the section heading (e.g. "1. Performance summary"). -->
    <div v-if="!reportMode" :class="vibrant ? 'border-b border-slate-700/60 px-4 py-3' : 'border-b border-surface-100 px-4 py-3'">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 :class="vibrant ? 'font-semibold text-white' : 'font-semibold text-surface-900'">{{ title }}</h3>
          <p v-if="subtitle" :class="vibrant ? 'mt-0.5 text-sm text-slate-400' : 'mt-0.5 text-sm text-surface-500'">{{ subtitle }}</p>
        </div>
        <div v-if="showMenu" class="relative">
          <button
            type="button"
            :class="
              vibrant
                ? 'rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                : 'rounded p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600'
            "
            aria-label="Widget menu"
            @click.stop="menuOpen = !menuOpen"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1  0 010 2z" />
            </svg>
          </button>
          <div
            v-if="menuOpen"
            :class="
              vibrant
                ? 'absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-slate-600 bg-slate-900 py-1 shadow-xl shadow-black/40'
                : 'absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-surface-200 bg-white py-1 shadow-lg'
            "
            @click.stop
          >
            <button
              type="button"
              :class="vibrant ? 'w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800' : 'w-full px-3 py-2 text-left text-sm text-surface-700 hover:bg-surface-50'"
              @click="emit('move-up'); menuOpen = false"
            >
              Move up
            </button>
            <button
              type="button"
              :class="vibrant ? 'w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800' : 'w-full px-3 py-2 text-left text-sm text-surface-700 hover:bg-surface-50'"
              @click="emit('move-down'); menuOpen = false"
            >
              Move down
            </button>
            <button
              type="button"
              :class="vibrant ? 'w-full px-3 py-2 text-left text-sm text-rose-400 hover:bg-slate-800' : 'w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50'"
              @click="emit('remove'); menuOpen = false"
            >
              Remove widget
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="subtitle" :class="vibrant ? 'border-b border-slate-700/60 px-4 py-3' : 'border-b border-surface-100 px-4 py-3'">
      <p :class="vibrant ? 'text-sm text-slate-400' : 'text-sm text-surface-500'">{{ subtitle }}</p>
    </div>
    <div class="p-4" :style="chartHeight ? { minHeight: chartHeight } : undefined">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const vibrant = useDashboardVibrant()

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    reportMode?: boolean
    showMenu?: boolean
    chartHeight?: string
  }>(),
  { subtitle: '', reportMode: false, showMenu: true, chartHeight: '280px' },
)

/** Compact chart cards (fixed height ≤ ~420px): avoid slicing the canvas across PDF pages. */
const printKeepTogether = computed(() => {
  if (!props.reportMode) return false
  const h = (props.chartHeight || '').trim()
  if (!h || h === 'auto') return false
  const m = /^(\d+(?:\.\d+)?)px$/i.exec(h)
  if (!m) return false
  const px = Number(m[1])
  return px > 0 && px <= 420
})

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
/* Table-style cards (auto height / tall charts): may span pages. */
.report-card.report-mode {
  break-inside: auto;
  page-break-inside: auto;
}
/* Pie/line/bar cards with bounded height: keep chart + legend on one sheet when possible. */
.report-card.report-mode.report-card-print-keep {
  break-inside: avoid;
  page-break-inside: avoid;
}
</style>
