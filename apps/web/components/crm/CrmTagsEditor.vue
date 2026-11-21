<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-surface-700">{{ label }}</label>
    <p v-if="hint" class="mt-0.5 text-xs text-surface-500">{{ hint }}</p>
    <div class="mt-2 flex flex-wrap gap-2">
      <span
        v-for="t in model"
        :key="t"
        class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
        :class="t === CRM_TAG_PREVIOUS_CLIENT ? 'bg-violet-100 text-violet-800' : 'bg-surface-100 text-surface-800'"
      >
        {{ t }}
        <button type="button" class="rounded-full px-1 hover:bg-black/10" aria-label="Remove tag" @click="remove(t)">×</button>
      </span>
      <span v-if="!model.length" class="text-xs text-surface-400">No tags yet</span>
    </div>
    <div class="mt-2 flex flex-wrap gap-2">
      <input
        v-model="draft"
        type="text"
        class="min-w-[8rem] flex-1 rounded-lg border border-surface-300 px-3 py-1.5 text-sm"
        placeholder="Add tag…"
        @keydown.enter.prevent="addDraft"
      />
      <button
        type="button"
        class="rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-surface-50"
        @click="addDraft"
      >
        Add
      </button>
    </div>
    <div v-if="suggestions.length" class="mt-2 flex flex-wrap gap-1.5">
      <span class="text-xs text-surface-500">Suggestions:</span>
      <button
        v-for="s in suggestions"
        :key="s"
        type="button"
        class="rounded-full border border-dashed border-surface-300 px-2 py-0.5 text-xs text-surface-700 hover:border-primary-400 hover:text-primary-700"
        @click="add(s)"
      >
        + {{ s }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CRM_PRESET_CONTACT_TAGS, CRM_TAG_PREVIOUS_CLIENT, addContactTag, parseContactTags, removeContactTag } from '~/utils/crmContactTags'

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    /** Extra preset chips (e.g. from workspace tag list). */
    knownTags?: string[]
  }>(),
  { label: 'Tags', hint: 'Use tags to filter contacts and email audiences.', knownTags: () => [] },
)

const model = defineModel<string[]>({ required: true })

const draft = ref('')

const suggestions = computed(() => {
  const have = new Set(model.value.map((t) => t.toLowerCase()))
  const pool = [...CRM_PRESET_CONTACT_TAGS, ...props.knownTags]
  const out: string[] = []
  for (const t of pool) {
    const n = t.trim()
    if (!n || have.has(n.toLowerCase())) continue
    if (!out.some((x) => x.toLowerCase() === n.toLowerCase())) out.push(n)
  }
  return out.slice(0, 12)
})

function syncFromModel() {
  model.value = parseContactTags(model.value)
}

function add(tag: string) {
  model.value = addContactTag(model.value, tag)
}

function remove(tag: string) {
  model.value = removeContactTag(model.value, tag)
}

function addDraft() {
  const t = draft.value.trim()
  if (!t) return
  add(t)
  draft.value = ''
}

onMounted(syncFromModel)
</script>