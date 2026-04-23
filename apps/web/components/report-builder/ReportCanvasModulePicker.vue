<script setup lang="ts">
import type { LibraryCatalogItem } from '~/types/reportBuilder'
import { REPORT_BUILDER_LIBRARY_GROUPS } from '~/utils/reportBuilderCatalog'
import ModuleLibraryIcon from '~/components/report-builder/ModuleLibraryIcon.vue'

const props = withDefaults(
  defineProps<{
    /** Inline under existing blocks: flatter chrome (parent supplies border). */
    variant?: 'standalone' | 'inline'
  }>(),
  { variant: 'standalone' },
)

const emit = defineEmits<{
  add: [item: LibraryCatalogItem]
}>()

const groups = REPORT_BUILDER_LIBRARY_GROUPS

/** `null` = top-level category grid; otherwise show that group’s modules. */
const openGroupId = ref<string | null>(null)

const openGroup = computed(() => groups.find((g) => g.id === openGroupId.value) ?? null)

function selectCategory(id: string) {
  openGroupId.value = id
}

function backToCategories() {
  openGroupId.value = null
}

function onAdd(item: LibraryCatalogItem) {
  emit('add', item)
}
</script>

<template>
  <div
    class="flex min-h-0 flex-1 flex-col overflow-hidden"
    :class="
      props.variant === 'inline'
        ? 'bg-transparent'
        : 'rounded-xl border border-surface-200/80 bg-white/90'
    "
  >
    <div v-if="!openGroup" class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-4">
      <div>
        <p class="text-sm font-semibold text-surface-900">Add a module</p>
        <p class="mt-1 text-xs leading-relaxed text-surface-500">Choose a category, then pick a block for this page.</p>
      </div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          v-for="g in groups"
          :key="g.id"
          type="button"
          class="flex flex-col items-start gap-1 rounded-xl border border-surface-200 bg-surface-50/60 px-3 py-3 text-left shadow-sm transition hover:border-primary-200 hover:bg-white hover:shadow-md"
          @click="selectCategory(g.id)"
        >
          <span class="text-sm font-semibold text-surface-900">{{ g.title }}</span>
          <span v-if="g.subtitle" class="text-[11px] leading-snug text-surface-500">{{ g.subtitle }}</span>
          <span class="text-[11px] font-medium text-surface-400">{{ g.items.length }} modules</span>
        </button>
      </div>
    </div>

    <div v-else class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-4">
      <button
        type="button"
        class="inline-flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary-600 hover:bg-primary-50"
        @click="backToCategories"
      >
        <span aria-hidden="true">←</span>
        All categories
      </button>
      <div>
        <h3 class="text-sm font-semibold text-surface-900">{{ openGroup.title }}</h3>
        <p v-if="openGroup.subtitle" class="mt-0.5 text-xs text-surface-500">{{ openGroup.subtitle }}</p>
      </div>
      <ul class="flex flex-col gap-2 pb-1">
        <li
          v-for="item in openGroup.items"
          :key="item.key"
          class="flex items-start gap-3 rounded-xl border border-surface-200 bg-white p-3 shadow-sm"
        >
          <ModuleLibraryIcon :type="item.type" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-surface-900">{{ item.title }}</p>
            <p class="mt-0.5 text-xs leading-snug text-surface-500">{{ item.description }}</p>
            <button
              type="button"
              class="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700"
              @click="onAdd(item)"
            >
              Add to page
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
