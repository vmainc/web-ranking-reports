<template>
  <div v-if="plan" class="space-y-6">
    <section>
      <h3 class="text-sm font-semibold uppercase tracking-wide text-surface-500">Top goals</h3>
      <ul class="mt-3 grid gap-3 sm:grid-cols-3">
        <li
          v-for="(g, i) in plan.goals"
          :key="i"
          class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm"
        >
          <p class="font-semibold text-surface-900">{{ g.title }}</p>
          <p v-if="g.measurable" class="mt-2 text-sm text-surface-600">{{ g.measurable }}</p>
        </li>
      </ul>
    </section>

    <section class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-surface-500">Strategic direction</h3>
      <p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-surface-800">{{ plan.strategy }}</p>
    </section>

    <section class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-surface-500">Execution plan</h3>
      <ol class="mt-4 space-y-6">
        <li v-for="(label, idx) in weekLabels" :key="label.key">
          <p class="text-sm font-semibold text-surface-900">{{ label.title }}</p>
          <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-surface-700">
            <li v-for="(step, j) in label.steps" :key="j">{{ step }}</li>
          </ul>
          <p v-if="!label.steps.length" class="mt-1 text-sm text-surface-400">—</p>
        </li>
      </ol>
    </section>

    <section class="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-surface-500">Quick wins</h3>
      <ul class="mt-3 list-inside list-disc space-y-1 text-sm text-surface-700">
        <li v-for="(w, i) in plan.quick_wins" v-show="w.trim()" :key="i">{{ w }}</li>
      </ul>
      <p v-if="!quickWinsNonEmpty" class="text-sm text-surface-400">—</p>
    </section>

    <div class="rounded-xl border border-surface-200 bg-surface-50/80 p-5">
      <h3 class="text-sm font-semibold text-surface-900">Add to To Do</h3>
      <p class="mt-1 text-xs text-surface-500">Tasks are created on the site you pick (same as site To Do).</p>
      <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="min-w-0 flex-1">
          <label class="block text-xs font-medium text-surface-600">Site</label>
          <select v-model="siteId" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
            <option value="">Select a site…</option>
            <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <label class="flex items-center gap-2 text-sm text-surface-700">
          <input v-model="includeQuickWins" type="checkbox" class="rounded border-surface-300 text-primary-600" />
          Include quick wins
        </label>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg bg-surface-900 px-4 py-2 text-sm font-semibold text-white hover:bg-surface-800 disabled:opacity-50"
          :disabled="addingTodos"
          @click="$emit('add-todos', { siteId, includeQuickWins })"
        >
          {{ addingTodos ? 'Adding…' : 'Add execution steps to To Do' }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-surface-300 bg-white px-4 py-2 text-sm font-semibold text-surface-800 hover:bg-surface-50 disabled:opacity-50"
          :disabled="saving"
          @click="$emit('save')"
        >
          {{ saving ? 'Saving…' : 'Save plan' }}
        </button>
      </div>
    </div>
  </div>
  <div v-else class="rounded-xl border border-dashed border-surface-200 bg-white p-10 text-center text-sm text-surface-500">
    Generate a plan to see goals, strategy, and weekly steps here.
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AgencyPlannerPlan, Site } from '~/types'

const props = defineProps<{
  plan: AgencyPlannerPlan | null
  sites: Site[]
  saving: boolean
  addingTodos: boolean
}>()

const siteId = defineModel<string>('selectedSiteId', { default: '' })

const emit = defineEmits<{
  save: []
  'add-todos': [payload: { siteId: string; includeQuickWins: boolean }]
}>()

const includeQuickWins = ref(true)

watch(
  () => props.sites,
  (list) => {
    if (!siteId.value && list?.length === 1) siteId.value = list[0].id
  },
  { immediate: true },
)

const weekLabels = computed(() => {
  const p = props.plan
  if (!p) return []
  const ep = p.execution_plan
  return [
    { key: 'w1', title: 'Week 1', steps: ep.week1 },
    { key: 'w2', title: 'Week 2', steps: ep.week2 },
    { key: 'w3', title: 'Week 3', steps: ep.week3 },
    { key: 'w4', title: 'Week 4', steps: ep.week4 },
  ]
})

const quickWinsNonEmpty = computed(() => props.plan?.quick_wins.some((w) => w.trim()))
</script>
