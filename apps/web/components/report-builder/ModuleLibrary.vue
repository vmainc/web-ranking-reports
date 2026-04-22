<script setup lang="ts">
import { useDraggable } from 'vue-draggable-plus'
import type { LibraryCatalogItem } from '~/types/reportBuilder'
import { REPORT_BUILDER_LIBRARY } from '~/utils/reportBuilderCatalog'
import { createModule } from '~/utils/reportBuilderFactory'
import ModuleLibraryIcon from '~/components/report-builder/ModuleLibraryIcon.vue'

const emit = defineEmits<{
  add: [item: LibraryCatalogItem]
}>()

const catalog = ref<LibraryCatalogItem[]>([...REPORT_BUILDER_LIBRARY])
const listEl = ref<HTMLElement | null>(null)

function cloneCatalogItem(item: LibraryCatalogItem) {
  return createModule(item.type, 0, item.defaultSectionId ? { sectionId: item.defaultSectionId } : undefined)
}

useDraggable(listEl, catalog, {
  sort: false,
  animation: 180,
  group: { name: 'reportModules', pull: 'clone', put: false },
  // Clone becomes a `ReportModule` on the canvas; vue-draggable-plus typings expect the same shape as the source list.
  clone: cloneCatalogItem as unknown as (item: LibraryCatalogItem) => LibraryCatalogItem,
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div>
      <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Module library</h2>
      <p class="mt-1 text-xs leading-relaxed text-surface-500">Drag into the canvas or tap Add.</p>
    </div>

    <div ref="listEl" class="flex flex-col gap-2">
      <div
        v-for="item in catalog"
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
  </div>
</template>
