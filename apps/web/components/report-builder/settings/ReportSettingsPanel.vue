<script setup lang="ts">
import type { ReportBuilderModel } from '~/types/reportBuilder'

defineProps<{
  model: ReportBuilderModel | null
}>()

const emit = defineEmits<{
  updateReport: [patch: Partial<Pick<ReportBuilderModel, 'title' | 'subtitle' | 'internalNotes' | 'theme'>>]
}>()
</script>

<template>
  <div v-if="model" class="flex flex-col gap-5">
    <div>
      <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Report</h2>
      <p class="mt-1 text-xs text-surface-500">Branding and defaults for this layout.</p>
    </div>

    <label class="block">
      <span class="text-xs font-medium text-surface-700">Title</span>
      <input
        :value="model.title"
        type="text"
        class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        @input="emit('updateReport', { title: ($event.target as HTMLInputElement).value })"
      />
    </label>

    <label class="block">
      <span class="text-xs font-medium text-surface-700">Subtitle</span>
      <input
        :value="model.subtitle ?? ''"
        type="text"
        class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        placeholder="Optional · e.g. March performance"
        @input="emit('updateReport', { subtitle: ($event.target as HTMLInputElement).value })"
      />
    </label>

    <label class="block">
      <span class="text-xs font-medium text-surface-700">Primary brand color</span>
      <div class="mt-1 flex items-center gap-2">
        <input
          :value="model.theme.primaryColor"
          type="color"
          class="h-10 w-14 cursor-pointer rounded border border-surface-200 bg-white p-1"
          @input="emit('updateReport', { theme: { ...model.theme, primaryColor: ($event.target as HTMLInputElement).value } })"
        />
        <input
          :value="model.theme.primaryColor"
          type="text"
          class="min-w-0 flex-1 rounded-lg border border-surface-200 px-3 py-2 text-sm font-mono shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @input="emit('updateReport', { theme: { ...model.theme, primaryColor: ($event.target as HTMLInputElement).value } })"
        />
      </div>
    </label>

    <label class="block">
      <span class="text-xs font-medium text-surface-700">Logo URL</span>
      <input
        :value="model.theme.logoUrl ?? ''"
        type="url"
        class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        placeholder="https://… or leave blank"
        @input="emit('updateReport', { theme: { ...model.theme, logoUrl: ($event.target as HTMLInputElement).value } })"
      />
      <p class="mt-1 text-[11px] text-surface-500">Upload to asset library can plug in here later.</p>
    </label>

    <label class="flex cursor-pointer items-center gap-2">
      <input
        :checked="model.theme.showCoverHeader"
        type="checkbox"
        class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
        @change="emit('updateReport', { theme: { ...model.theme, showCoverHeader: ($event.target as HTMLInputElement).checked } })"
      />
      <span class="text-sm text-surface-800">Show cover header</span>
    </label>

    <label class="block">
      <span class="text-xs font-medium text-surface-700">Internal notes</span>
      <textarea
        :value="model.internalNotes ?? ''"
        rows="4"
        class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        placeholder="Not shown to clients — team context only."
        @input="emit('updateReport', { internalNotes: ($event.target as HTMLTextAreaElement).value })"
      />
    </label>
  </div>
  <p v-else class="text-sm text-surface-500">Loading report settings…</p>
</template>
