<script setup lang="ts">
import type { LibraryCatalogItem } from '~/types/reportBuilder'
import { REPORT_BUILDER_LIBRARY_GROUPS } from '~/utils/reportBuilderCatalog'
import ModuleLibraryGroup from '~/components/report-builder/ModuleLibraryGroup.vue'

const emit = defineEmits<{
  add: [item: LibraryCatalogItem]
}>()

const groups = REPORT_BUILDER_LIBRARY_GROUPS

/** Collapsed accordion ids (default: all expanded). */
const closedGroupIds = ref(new Set<string>())

function isGroupOpen(groupId: string) {
  return !closedGroupIds.value.has(groupId)
}

function toggleGroup(groupId: string) {
  const next = new Set(closedGroupIds.value)
  if (next.has(groupId)) next.delete(groupId)
  else next.add(groupId)
  closedGroupIds.value = next
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div>
      <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Module library</h2>
      <p class="mt-1 text-xs leading-relaxed text-surface-500">Drag into a page or tap Add. Grouped by integration.</p>
    </div>

    <div class="flex flex-col gap-1">
      <div
        v-for="group in groups"
        :key="group.id"
        class="overflow-hidden rounded-xl border border-surface-200 bg-surface-50/80"
      >
        <button
          type="button"
          class="flex w-full items-start gap-2 px-3 py-2.5 text-left transition hover:bg-white/90"
          :aria-expanded="isGroupOpen(group.id)"
          @click="toggleGroup(group.id)"
        >
          <span class="mt-0.5 shrink-0 text-surface-500" aria-hidden="true">
            <svg
              class="h-4 w-4 transition-transform duration-200"
              :class="isGroupOpen(group.id) ? 'rotate-0' : '-rotate-90'"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold text-surface-900">{{ group.title }}</span>
            <span v-if="group.subtitle" class="mt-0.5 block text-[11px] leading-snug text-surface-500">{{
              group.subtitle
            }}</span>
            <span class="mt-1 block text-[11px] font-medium text-surface-400">{{ group.items.length }} modules</span>
          </span>
        </button>

        <div v-show="isGroupOpen(group.id)" class="border-t border-surface-200/90 bg-white px-2 pb-2 pt-1">
          <ModuleLibraryGroup :items="group.items" @add="emit('add', $event)" />
        </div>
      </div>
    </div>
  </div>
</template>
