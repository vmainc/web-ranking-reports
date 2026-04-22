<script setup lang="ts">
import type { ReportModule, AIInsightsTone, ImageBrandingAlignment } from '~/types/reportBuilder'

defineProps<{
  module: ReportModule
}>()

const emit = defineEmits<{
  updateTitle: [title: string]
  updateSettings: [patch: Record<string, unknown>]
}>()

const dateOptions = [
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_28_days', label: 'Last 28 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'this_month', label: 'This month' },
]

const tones: { value: AIInsightsTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'concise', label: 'Concise' },
]

const alignments: { value: ImageBrandingAlignment; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]
</script>

<template>
  <div class="flex flex-col gap-5">
    <div>
      <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Module</h2>
      <p class="mt-1 text-xs text-surface-500">Changes apply to the selected block immediately.</p>
    </div>

    <label class="block">
      <span class="text-xs font-medium text-surface-700">Block title</span>
      <input
        :value="module.title"
        type="text"
        class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        @input="emit('updateTitle', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <!-- Traffic overview -->
    <template v-if="module.type === 'traffic_overview'">
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Date range</span>
        <select
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          :value="module.settings.dateRange"
          @change="emit('updateSettings', { dateRange: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="o in dateOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.comparisonEnabled"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { comparisonEnabled: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Comparison period</span>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.showChart"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { showChart: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Show chart</span>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.showTotals"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { showTotals: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Show totals</span>
      </label>
    </template>

    <!-- Keyword rankings -->
    <template v-else-if="module.type === 'keyword_rankings'">
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Keyword group name</span>
        <input
          :value="module.settings.keywordGroupName"
          type="text"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @input="emit('updateSettings', { keywordGroupName: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Max keywords</span>
        <input
          :value="module.settings.maxKeywords"
          type="number"
          min="1"
          max="100"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @input="emit('updateSettings', { maxKeywords: Number(($event.target as HTMLInputElement).value) || 1 })"
        />
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.showChangeColumn"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { showChangeColumn: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Show change column</span>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.showCurrentRank"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { showCurrentRank: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Show current rank</span>
      </label>
    </template>

    <!-- Conversions -->
    <template v-else-if="module.type === 'conversions_summary'">
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Date range</span>
        <select
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          :value="module.settings.dateRange"
          @change="emit('updateSettings', { dateRange: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="o in dateOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.comparisonEnabled"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { comparisonEnabled: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Comparison period</span>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.showConversionValue"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { showConversionValue: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Show conversion value</span>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="module.settings.showSourceBreakdown"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('updateSettings', { showSourceBreakdown: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Show source breakdown</span>
      </label>
    </template>

    <!-- AI insights -->
    <template v-else-if="module.type === 'ai_insights'">
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Summary text</span>
        <textarea
          :value="module.settings.body"
          rows="6"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @input="emit('updateSettings', { body: ($event.target as HTMLTextAreaElement).value })"
        />
      </label>
      <button
        type="button"
        class="w-full rounded-lg border border-dashed border-surface-300 px-3 py-2 text-xs font-semibold text-surface-600 hover:border-primary-300 hover:text-primary-700"
        disabled
      >
        Regenerate (coming soon)
      </button>
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Tone</span>
        <select
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          :value="module.settings.tone"
          @change="emit('updateSettings', { tone: ($event.target as HTMLSelectElement).value as AIInsightsTone })"
        >
          <option v-for="t in tones" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </label>
    </template>

    <!-- Notes -->
    <template v-else-if="module.type === 'notes'">
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Title</span>
        <input
          :value="module.settings.title"
          type="text"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @input="emit('updateSettings', { title: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Notes</span>
        <textarea
          :value="module.settings.body"
          rows="8"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @input="emit('updateSettings', { body: ($event.target as HTMLTextAreaElement).value })"
        />
      </label>
    </template>

    <!-- Image branding -->
    <template v-else-if="module.type === 'image_branding'">
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Image URL</span>
        <input
          :value="module.settings.imageUrl"
          type="url"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="https://…"
          @input="emit('updateSettings', { imageUrl: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Headline</span>
        <input
          :value="module.settings.headline"
          type="text"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @input="emit('updateSettings', { headline: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Subheadline</span>
        <input
          :value="module.settings.subheadline"
          type="text"
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @input="emit('updateSettings', { subheadline: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="block">
        <span class="text-xs font-medium text-surface-700">Alignment</span>
        <select
          class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          :value="module.settings.alignment"
          @change="emit('updateSettings', { alignment: ($event.target as HTMLSelectElement).value as ImageBrandingAlignment })"
        >
          <option v-for="a in alignments" :key="a.value" :value="a.value">{{ a.label }}</option>
        </select>
      </label>
    </template>
  </div>
</template>
