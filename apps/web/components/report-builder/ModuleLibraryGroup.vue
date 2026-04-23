<script setup lang="ts">
import { useDraggable } from 'vue-draggable-plus'
import type { LibraryCatalogItem } from '~/types/reportBuilder'
import { createModule } from '~/utils/reportBuilderFactory'
import ModuleLibraryIcon from '~/components/report-builder/ModuleLibraryIcon.vue'

const props = defineProps<{
  items: LibraryCatalogItem[]
}>()

const emit = defineEmits<{
  add: [item: LibraryCatalogItem]
}>()

const list = ref<LibraryCatalogItem[]>([])

watch(
  () => props.items,
  (v) => {
    list.value = v.slice()
  },
  { immediate: true, deep: true },
)

const listEl = ref<HTMLElement | null>(null)

function cloneCatalogItem(item: LibraryCatalogItem) {
  return createModule(item.type, 0, item.defaultSectionId ? { sectionId: item.defaultSectionId } : undefined)
}

useDraggable(listEl, list, {
  sort: false,
  animation: 180,
  group: { name: 'reportModules', pull: 'clone', put: false },
  clone: cloneCatalogItem as unknown as (item: LibraryCatalogItem) => LibraryCatalogItem,
})
</script>

<template>
  <div ref="listEl" class="flex flex-col gap-2">
    <div
      v-for="item in list"
      :key="item.key"
      class="flex cursor-grab items-start gap-3 rounded-xl border border-surface-200 bg-white p-3 shadow-sm transition hover:border-primary-200 hover:shadow-md active:cursor-grabbing"
    >
      <ModuleLibraryIcon :type="item.type" />
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-surface-900">{{ item.title }}</p>
        <p class="mt-0.5 text-xs leading-snug text-surface-500">{{ item.description }}</p>
        <button
          type="button"
          class="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700"
          @click.stop="emit('add', item)"
        >
          Add
        </button>
      </div>
    </div>
  </div>
</template>
