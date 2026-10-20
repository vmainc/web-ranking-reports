<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-surface-500">Proposal sections</h3>
      <button
        v-if="!disabled"
        type="button"
        class="text-sm font-medium text-primary-600 hover:underline"
        @click="addSection"
      >
        Add section
      </button>
    </div>
    <p class="text-xs text-surface-500">Drag to reorder. Hide sections you do not need; rename titles for each client.</p>
    <ul ref="listEl" class="space-y-2">
      <li
        v-for="(section, idx) in localSections"
        :key="section.id"
        class="rounded-lg border border-surface-200 bg-surface-50/80 p-3"
        :data-id="section.id"
      >
        <div class="flex flex-wrap items-start gap-2">
          <span v-if="!disabled" class="cursor-grab select-none text-surface-400" title="Drag to reorder">⋮⋮</span>
          <div class="min-w-0 flex-1 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <input
                v-model="section.title"
                type="text"
                class="min-w-[8rem] flex-1 rounded border border-surface-300 px-2 py-1 text-sm font-medium"
                :disabled="disabled || section.key === 'investment'"
                @input="emitChange"
              />
              <label v-if="section.key !== 'cover' && section.key !== 'investment'" class="flex items-center gap-1 text-xs text-surface-600">
                <input v-model="section.hidden" type="checkbox" :disabled="disabled" @change="emitChange" />
                Hidden
              </label>
              <button
                v-if="!disabled && section.key === 'custom'"
                type="button"
                class="text-xs text-red-600 hover:underline"
                @click="removeAt(idx)"
              >
                Remove
              </button>
            </div>
            <textarea
              v-if="section.key !== 'investment' && section.key !== 'cover'"
              v-model="section.body"
              rows="3"
              class="w-full rounded border border-surface-300 px-2 py-1.5 text-sm"
              :placeholder="placeholderFor(section.key)"
              :disabled="disabled"
              @input="emitChange"
            />
            <p v-else-if="section.key === 'investment'" class="text-xs text-surface-500">
              Line items and pricing are edited below. Totals appear automatically in preview and PDF.
            </p>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import Sortable from 'sortablejs'
import { newSectionId, normalizeSections, type ProposalSection } from '~/utils/proposalContent'

const props = defineProps<{
  sections: ProposalSection[]
  disabled?: boolean
}>()

const emit = defineEmits<{ change: [sections: ProposalSection[]] }>()

const localSections = ref<ProposalSection[]>([])
const listEl = ref<HTMLElement | null>(null)
let sortable: Sortable | null = null

watch(
  () => props.sections,
  (s) => {
    localSections.value = normalizeSections(s)
  },
  { immediate: true, deep: true },
)

function emitChange() {
  emit('change', normalizeSections(localSections.value))
}

function addSection() {
  localSections.value.push({
    id: newSectionId(),
    key: 'custom',
    title: 'Additional section',
    body: '',
    hidden: false,
    sort_order: localSections.value.length,
  })
  emitChange()
}

function removeAt(idx: number) {
  localSections.value.splice(idx, 1)
  emitChange()
}

function placeholderFor(key: string) {
  if (key === 'executive_summary') return 'Summary of opportunity and recommended partnership…'
  if (key === 'goals_challenges') return 'Client goals, pain points, and constraints…'
  if (key === 'strategy_scope') return 'Recommended approach and scope…'
  if (key === 'deliverables_timeline') return 'Deliverables, milestones, and timeline…'
  if (key === 'terms_assumptions') return 'Terms, assumptions, and exclusions…'
  if (key === 'acceptance') return 'Instructions for signing (optional)…'
  return 'Section content…'
}

onMounted(() => {
  if (!listEl.value || props.disabled) return
  sortable = Sortable.create(listEl.value, {
    animation: 150,
    handle: '.cursor-grab',
    onEnd() {
      const ids = [...listEl.value!.children].map((el) => (el as HTMLElement).dataset.id || '')
      const map = new Map(localSections.value.map((s) => [s.id, s]))
      localSections.value = ids.map((id, i) => {
        const s = map.get(id)!
        return { ...s, sort_order: i }
      })
      emitChange()
    },
  })
})

onBeforeUnmount(() => {
  sortable?.destroy()
})
</script>
