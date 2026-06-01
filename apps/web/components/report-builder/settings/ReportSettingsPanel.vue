<script setup lang="ts">
import type { ReportBuilderModel } from '~/types/reportBuilder'
import ReportDeliveryEmailSection from '~/components/report-builder/settings/ReportDeliveryEmailSection.vue'

defineProps<{
  model: ReportBuilderModel | null
  siteName?: string
}>()

const emit = defineEmits<{
  updateReport: [patch: Partial<Pick<ReportBuilderModel, 'title' | 'subtitle' | 'internalNotes' | 'theme' | 'deliveryEmail'>>]
}>()
</script>

<template>
  <div v-if="model" class="flex flex-col gap-5">
    <div>
      <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Report</h2>
      <p class="mt-1 text-xs text-surface-500">
        Title and optional logo URL for this layout. <strong class="font-medium text-surface-700">Report colors</strong> (primary, accent, text,
        surface) always follow
        <NuxtLink to="/agency" class="font-medium text-primary-600 hover:underline">Agency → Report branding colors</NuxtLink>.
      </p>
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
      <span class="text-xs font-medium text-surface-700">Logo URL</span>
      <input
        :value="model.theme.logoUrl ?? ''"
        type="url"
        class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        placeholder="https://… or leave blank"
        @input="emit('updateReport', { theme: { ...model.theme, logoUrl: ($event.target as HTMLInputElement).value } })"
      />
      <p class="mt-1 text-[11px] text-surface-500">Used on the report cover and as the email logo fallback.</p>
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

    <ReportDeliveryEmailSection
      :model="model"
      :site-name="siteName ?? ''"
      @update="(patch) => emit('updateReport', { deliveryEmail: { ...model.deliveryEmail, ...patch } })"
    />
  </div>
  <p v-else class="text-sm text-surface-500">Loading report settings…</p>
</template>
