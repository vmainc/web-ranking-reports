<script setup lang="ts">
import ModuleLibrary from '~/components/report-builder/ModuleLibrary.vue'
import ReportCanvas from '~/components/report-builder/ReportCanvas.vue'
import ReportSettingsPanel from '~/components/report-builder/settings/ReportSettingsPanel.vue'
import ModuleSettingsPanel from '~/components/report-builder/settings/ModuleSettingsPanel.vue'

definePageMeta({
  layout: 'default',
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
  selectedModuleId,
  selectedModule,
  save,
  selectModule,
  updateReport,
  setModules,
  addModule,
  removeModule,
  dupModule,
  updateModule,
  updateModuleTitle,
} = useReportBuilder(reportId, authHeaders)

provide('reportBuilderSiteId', siteId)

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
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col bg-surface-100/80">
    <header class="shrink-0 border-b border-surface-200 bg-white px-4 py-3 shadow-sm sm:px-6">
      <div class="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3">
        <NuxtLink
          to="/reports"
          class="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-surface-600 hover:bg-surface-100 hover:text-surface-900"
        >
          <span aria-hidden="true">←</span> Reports
        </NuxtLink>
        <NuxtLink
          v-if="siteId"
          :to="{ path: `/sites/${siteId}/full-report`, query: { reportId: reportId } }"
          class="hidden text-sm font-medium text-surface-500 hover:text-primary-600 sm:inline"
        >
          Open live report
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

    <div v-if="loading" class="flex flex-1 items-center justify-center py-24 text-sm text-surface-500">Loading builder…</div>

    <div v-else-if="!model" class="flex flex-1 flex-col items-center justify-center gap-2 py-24 text-center">
      <p class="text-sm font-medium text-surface-800">Could not load this report.</p>
      <p class="max-w-sm text-xs text-surface-500">{{ error || 'Check that you are signed in and the report exists.' }}</p>
      <NuxtLink to="/reports" class="text-sm font-semibold text-primary-600 hover:underline">Back to reports</NuxtLink>
    </div>

    <div v-else class="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-0 lg:flex-row">
      <aside
        class="w-full shrink-0 border-surface-200 bg-white p-4 shadow-sm lg:max-h-[calc(100vh-5.5rem)] lg:w-72 lg:overflow-y-auto lg:border-r lg:shadow-none xl:w-80"
      >
        <ModuleLibrary @add="addModule" />
      </aside>

      <main class="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <div class="mx-auto max-w-3xl space-y-4">
          <div class="rounded-xl border border-surface-200 bg-white px-4 py-3 shadow-sm">
            <p class="text-xs font-medium uppercase tracking-wide text-surface-500">Preview</p>
            <p class="mt-1 text-sm text-surface-600">
              Blocks stack full width for V1. Column widths can plug into the same model later via
              <code class="rounded bg-surface-100 px-1 text-xs">layoutWidth</code>.
            </p>
          </div>
          <ReportCanvas
            :model-value="model.modules"
            :selected-id="selectedModuleId"
            @update:model-value="setModules"
            @select="selectModule"
            @edit="onEditModule"
            @duplicate="dupModule"
            @remove="removeModule"
          />
        </div>
      </main>

      <aside
        class="w-full shrink-0 border-surface-200 bg-white p-4 shadow-sm lg:flex lg:min-h-0 lg:w-80 lg:flex-col lg:border-l lg:shadow-none xl:w-96"
      >
        <div class="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div class="flex items-center justify-between gap-2 border-b border-surface-100 pb-3">
            <h2 class="text-sm font-semibold text-surface-900">Settings</h2>
            <button
              v-if="selectedModule"
              type="button"
              class="text-xs font-semibold text-primary-600 hover:text-primary-700"
              @click="selectModule(null)"
            >
              Report settings
            </button>
          </div>
          <ReportSettingsPanel v-if="!selectedModule" :model="model" @update-report="updateReport" />
          <ModuleSettingsPanel
            v-else
            :module="selectedModule"
            @update-title="updateModuleTitle(selectedModule.id, $event)"
            @update-settings="updateModule(selectedModule.id, $event)"
          />
        </div>
      </aside>
    </div>
  </div>
</template>
