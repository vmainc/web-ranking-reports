<template>
  <div
    data-theme-toggle
    class="inline-flex rounded-lg border p-0.5"
    :class="isDark ? 'border-slate-600 bg-slate-800/80' : 'border-surface-300 bg-white shadow-sm'"
    role="group"
    aria-label="Color theme"
  >
    <button
      type="button"
      data-theme-option
      class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 sm:text-sm"
      :class="
        isDark
          ? 'bg-slate-700 text-white shadow-sm'
          : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
      "
      :aria-pressed="isDark"
      @click.stop="setTheme('dark')"
    >
      <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      </svg>
      <span>Dark</span>
    </button>
    <button
      type="button"
      data-theme-option
      class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 sm:text-sm"
      :class="
        isLight
          ? 'bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-200/80'
          : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
      "
      :aria-pressed="isLight"
      @click.stop="setTheme('light')"
    >
      <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
        />
      </svg>
      <span>Light</span>
    </button>
  </div>
</template>

<script setup lang="ts">
const { isDark, isLight, setTheme } = useAppTheme()
</script>
