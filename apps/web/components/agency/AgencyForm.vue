<template>
  <div class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
    <h2 class="text-lg font-semibold text-surface-900">Your agency</h2>
    <p class="mt-1 text-sm text-surface-500">Tell us a bit about your shop — we’ll build a tailored plan.</p>

    <div class="mt-5 space-y-4">
      <div>
        <label class="block text-sm font-medium text-surface-700">Agency type</label>
        <select v-model="form.agencyType" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
          <option value="seo">SEO</option>
          <option value="ppc">PPC</option>
          <option value="web_design">Web Design</option>
          <option value="full_service">Full Service</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-surface-700">Monthly revenue (optional)</label>
        <input
          v-model="form.monthlyRevenue"
          type="text"
          class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
          placeholder="e.g. $50k or range"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-surface-700">Number of clients</label>
        <input
          v-model.number="form.clientCount"
          type="number"
          min="0"
          max="99999"
          class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-surface-700">Primary goal</label>
        <select v-model="form.primaryGoal" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
          <option value="more_clients">Get more clients</option>
          <option value="retention">Increase retention</option>
          <option value="improve_results">Improve client results</option>
          <option value="scale_operations">Scale operations</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-surface-700">What are you struggling with? (optional)</label>
        <textarea
          v-model="form.notes"
          rows="4"
          class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
          placeholder="Capacity, sales, delivery, tools, hiring…"
        />
      </div>
    </div>

    <div class="mt-6 flex flex-wrap gap-3">
      <button
        type="button"
        class="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
        :disabled="generating"
        @click="$emit('generate')"
      >
        {{ generating ? 'Building your plan…' : 'Generate plan' }}
      </button>
      <button
        v-if="hasPlan"
        type="button"
        class="rounded-lg border border-surface-300 bg-white px-4 py-2.5 text-sm font-semibold text-surface-800 hover:bg-surface-50"
        :disabled="generating"
        @click="$emit('regenerate')"
      >
        Regenerate
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AgencyPlannerFormInput } from '~/types'

defineProps<{
  form: AgencyPlannerFormInput
  generating: boolean
  hasPlan?: boolean
}>()

defineEmits<{
  generate: []
  regenerate: []
}>()
</script>
