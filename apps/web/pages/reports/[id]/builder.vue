<script setup lang="ts">
import ReportBuilderPagesSortable from '~/components/report-builder/ReportBuilderPagesSortable.vue'
import ReportCanvas from '~/components/report-builder/ReportCanvas.vue'
import ReportSettingsPanel from '~/components/report-builder/settings/ReportSettingsPanel.vue'
import ModuleSettingsPanel from '~/components/report-builder/settings/ModuleSettingsPanel.vue'
import type { LibraryCatalogItem, ReportPage } from '~/types/reportBuilder'

definePageMeta({
  layout: 'default',
  ssr: false,
})

const route = useRoute()
const reportId = computed(() => String(route.params.id || ''))

const pb = usePocketbase()

function authHeaders(): Record<string, string> {
  const t = pb.authStore.token
  return t ? { Authorization: `Bearer ${t}` } : {}
}

const {
  model,
  loading,
  saving,
  error,
  lastSavedAt,
  siteId,
  site,
  workspaceOwnerPlan,
  selectedPageId,
  selectedModuleId,
  selectedModule,
  save,
  selectPage,
  selectModule,
  updateReport,
  setModulesForPage,
  addModule,
  removeModule,
  dupModule,
  updateModule,
  updateModuleTitle,
  updateModulePageBreak,
  addPage,
  removePage,
  updatePageTitle,
  setPageOrder,
} = useReportBuilder(reportId, authHeaders)

provide('reportBuilderSiteId', siteId)

const modelRef = computed(() => model.value)
provide('reportBuilderModel', modelRef)
provide('reportPreviewSite', site)
provide('reportWorkspaceOwnerPlan', workspaceOwnerPlan)

/** Mutable page list for Sortable — must match v-for source or drag snaps back. */
const orderedPages = ref<ReportPage[]>([])

function syncOrderedPagesFromModel() {
  const p = model.value?.pages ?? []
  orderedPages.value = [...p].sort((a, b) => a.order - b.order)
}

const pageDragActive = ref(false)
/** Avoid SSR/client branch mismatch while report loads. */
const builderReady = ref(false)

watch(
  () => model.value?.pages,
  () => {
    if (pageDragActive.value) return
    syncOrderedPagesFromModel()
  },
  { deep: true, immediate: true },
)

function onPageDragStart() {
  pageDragActive.value = true
}

function onPageDragEnd() {
  setPageOrder([...orderedPages.value])
  pageDragActive.value = false
}

/** Page ids whose module canvas is collapsed (use a Set so toggles stay reactive). */
const collapsedPageIds = ref(new Set<string>())

watch(orderedPages, (pages) => {
  const ids = new Set(pages.map((p) => p.id))
  const next = new Set<string>()
  for (const id of collapsedPageIds.value) {
    if (ids.has(id)) next.add(id)
  }
  if (next.size !== collapsedPageIds.value.size) {
    collapsedPageIds.value = next
  }
})

function isPageCanvasExpanded(pageId: string) {
  return !collapsedPageIds.value.has(pageId)
}

function expandPageCanvas(pageId: string) {
  if (!collapsedPageIds.value.has(pageId)) return
  const next = new Set(collapsedPageIds.value)
  next.delete(pageId)
  collapsedPageIds.value = next
}

function togglePageCanvas(pageId: string) {
  const next = new Set(collapsedPageIds.value)
  if (next.has(pageId)) next.delete(pageId)
  else next.add(pageId)
  collapsedPageIds.value = next
}

function selectPageAndExpand(pageId: string) {
  expandPageCanvas(pageId)
  selectPage(pageId)
}

/** When a module is selected (e.g. from settings “back” then canvas), expand its page so the canvas is visible. */
watch(selectedModuleId, (id) => {
  if (!id || !model.value) return
  for (const p of model.value.pages) {
    if (p.modules.some((m) => m.id === id)) {
      expandPageCanvas(p.id)
      break
    }
  }
})

function onCanvasLibraryAdd(pageId: string, item: LibraryCatalogItem) {
  selectPage(pageId)
  expandPageCanvas(pageId)
  addModule(item)
}

const lastSavedLabel = computed(() => {
  if (!lastSavedAt.value) return 'Not saved yet'
  try {
    return `Saved ${lastSavedAt.value.toLocaleTimeString(undefined, { timeStyle: 'short' })}`
  } catch {
    return 'Saved'
  }
})

function onEditModule(id: string) {
  selectModule(id)
}

const { cssVars: agencyBrandingCss, load: loadAgencyBranding } = useAgencyReportBranding()

onMounted(() => {
  builderReady.value = true
  void loadAgencyBranding()
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" :style="agencyBrandingCss">
    <header class="sticky top-14 z-40 shrink-0 border-b border-slate-800/80 bg-slate-950/90 px-4 py-3 shadow-sm backdrop-blur-md sm:px-6">
      <div class="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3">
        <NuxtLink
          to="/reports"
          class="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-surface-600 hover:bg-surface-100 hover:text-surface-900"
        >
          <span aria-hidden="true">←</span> Reports
        </NuxtLink>
        <NuxtLink
          v-if="reportId"
          :to="`/reports/${reportId}/preview`"
          class="hidden text-sm font-medium text-surface-500 hover:text-primary-600 sm:inline"
        >
          Page preview
        </NuxtLink>
        <div class="mx-2 hidden h-6 w-px bg-surface-200 sm:block" />
        <div class="min-w-0 flex-1">
          <h1 class="truncate text-base font-semibold text-surface-900">{{ model?.title ?? 'Report builder' }}</h1>
          <p class="text-xs text-surface-500">{{ lastSavedLabel }}</p>
        </div>
        <p v-if="error" class="w-full text-xs text-red-600 sm:w-auto">{{ error }}</p>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="saving || !model"
          @click="save()"
        >
          {{ saving ? 'Saving…' : 'Save report' }}
        </button>
      </div>
    </header>

    <div v-if="!builderReady || loading" class="flex flex-1 items-center justify-center py-24 text-sm text-surface-500">Loading builder…</div>

    <div v-else-if="!model" class="flex flex-1 flex-col items-center justify-center gap-2 py-24 text-center">
      <p class="text-sm font-medium text-surface-800">Could not load this report.</p>
      <p class="max-w-sm text-xs text-surface-500">{{ error || 'Check that you are signed in and the report exists.' }}</p>
      <NuxtLink to="/reports" class="text-sm font-semibold text-primary-600 hover:underline">Back to reports</NuxtLink>
    </div>

    <div v-else class="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-0 lg:flex-row">
      <main class="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <div class="mx-auto w-full max-w-4xl space-y-5">
          <div class="rounded-xl border border-slate-700/60 bg-slate-900/50 px-4 py-3 shadow-sm">
            <p class="text-xs font-medium uppercase tracking-wide text-slate-400">Page-based layout</p>
            <p class="mt-1 text-sm text-slate-300">
              Each page is one PDF sheet. Drag pages by the grip handle to reorder; the table of contents updates automatically.
              On an empty page, pick a category (for example Google Analytics), then add a block. Use
              <strong class="font-medium text-slate-100">+ Add module</strong> when a page already has blocks. Highlight a page (blue ring) so new blocks land on that sheet.
            </p>
          </div>

          <ReportBuilderPagesSortable
            v-model="orderedPages"
            @drag-start="onPageDragStart"
            @drag-end="onPageDragEnd"
          >
          <section
            v-for="(page, pageIdx) in orderedPages"
            :key="page.id"
            :data-page-id="page.id"
            class="rounded-2xl border border-slate-700/80 bg-slate-900/40 shadow-sm transition"
            :class="selectedPageId === page.id ? 'border-primary-500/70 ring-2 ring-primary-500/25' : ''"
            @click.self="selectPageAndExpand(page.id)"
          >
            <div
              class="flex flex-wrap items-center gap-2 px-3 py-2"
              :class="isPageCanvasExpanded(page.id) ? 'border-b border-slate-700/60' : ''"
              @click.self="selectPageAndExpand(page.id)"
            >
              <button
                type="button"
                class="page-drag-handle inline-flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 active:cursor-grabbing"
                aria-label="Drag to reorder page"
                title="Drag to reorder"
                @click.stop
              >
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm6-12a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </button>
              <button
                type="button"
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                :aria-expanded="isPageCanvasExpanded(page.id)"
                :aria-label="isPageCanvasExpanded(page.id) ? 'Collapse page' : 'Expand page'"
                :title="isPageCanvasExpanded(page.id) ? 'Collapse' : 'Expand'"
                @click.stop="togglePageCanvas(page.id)"
              >
                <svg
                  class="h-5 w-5 transition-transform duration-200"
                  :class="isPageCanvasExpanded(page.id) ? 'rotate-0' : '-rotate-90'"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Page</span>
              <input
                :value="page.title"
                type="text"
                class="min-w-[6rem] flex-1 rounded border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-slate-100 hover:border-slate-600 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
                @click.stop
                @change="updatePageTitle(page.id, ($event.target as HTMLInputElement).value)"
              />
              <span
                v-if="!isPageCanvasExpanded(page.id)"
                class="text-xs text-slate-400"
              >
                {{ page.modules.length }} block{{ page.modules.length === 1 ? '' : 's' }}
              </span>
              <button
                type="button"
                class="ml-auto rounded-lg px-2 py-1 text-xs font-medium text-primary-400 hover:bg-primary-500/15"
                @click.stop="selectPageAndExpand(page.id)"
              >
                Use for new blocks
              </button>
              <button
                type="button"
                class="rounded-lg px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/15"
                @click.stop="removePage(page.id)"
              >
                Delete page
              </button>
            </div>
            <div v-show="isPageCanvasExpanded(page.id)" class="p-3" @click.self="selectPageAndExpand(page.id)">
              <div class="report-document rounded-xl bg-white shadow-inner ring-1 ring-slate-200/80">
              <ReportCanvas
                page-fit
                :subsequent-sheet="pageIdx > 0"
                :model-value="page.modules"
                :selected-id="selectedModuleId"
                @update:model-value="setModulesForPage(page.id, $event)"
                @library-add="onCanvasLibraryAdd(page.id, $event)"
                @select="selectModule"
                @edit="onEditModule"
                @duplicate="dupModule"
                @remove="removeModule"
              />
              </div>
            </div>
          </section>
          </ReportBuilderPagesSortable>

          <div class="flex justify-center sm:justify-start">
            <button
              type="button"
              class="inline-flex w-full items-center justify-center rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-100 shadow-sm hover:bg-slate-700 sm:w-auto sm:py-1.5"
              @click="addPage()"
            >
              + Add page
            </button>
          </div>
        </div>
      </main>

      <aside
        class="w-full shrink-0 border-slate-800 bg-slate-900/80 p-4 shadow-sm lg:flex lg:min-h-0 lg:w-80 lg:flex-col lg:border-l lg:shadow-none xl:w-96"
      >
        <div class="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div class="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
            <h2 class="text-sm font-semibold text-slate-100">Settings</h2>
            <button
              v-if="selectedModule"
              type="button"
              class="text-xs font-semibold text-primary-600 hover:text-primary-700"
              @click="selectModule(null)"
            >
              Report settings
            </button>
          </div>
          <ReportSettingsPanel v-if="!selectedModule" :model="model as ReportBuilderModel | null" @update-report="updateReport" />
          <ModuleSettingsPanel
            v-else
            :module="selectedModule"
            @update-title="updateModuleTitle(selectedModule.id, $event)"
            @update-settings="updateModule(selectedModule.id, $event)"
            @update-page-break="updateModulePageBreak(selectedModule.id, $event)"
          />
        </div>
      </aside>
    </div>
  </div>
</template>
