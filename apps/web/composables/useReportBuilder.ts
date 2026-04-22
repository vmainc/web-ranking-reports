import type { Report } from '~/types'
import type { LibraryCatalogItem, ReportBuilderModel, ReportModule, ReportModuleType } from '~/types/reportBuilder'
import { createModule, duplicateModule, normalizeModuleOrders } from '~/utils/reportBuilderFactory'
import { getReportById, saveReport as persistReport, builderModelFromReport } from '~/services/reportBuilderService'

export function useReportBuilder(reportId: MaybeRef<string>, getHeaders: () => Record<string, string>) {
  const idRef = toRef(reportId)

  const loading = ref(true)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const lastSavedAt = ref<Date | null>(null)
  const siteId = ref<string | null>(null)

  const model = ref<ReportBuilderModel | null>(null)
  const rawPayload = ref<Record<string, unknown> | undefined>(undefined)

  const selectedModuleId = ref<string | null>(null)

  const selectedModule = computed(() => {
    const m = model.value?.modules ?? []
    const id = selectedModuleId.value
    if (!id) return null
    return m.find((x) => x.id === id) ?? null
  })

  async function load() {
    loading.value = true
    error.value = null
    const rid = idRef.value
    if (!rid) {
      error.value = 'Missing report id'
      loading.value = false
      return
    }
    try {
      const report = await getReportById(rid, getHeaders())
      rawPayload.value =
        report.payload_json && typeof report.payload_json === 'object'
          ? { ...(report.payload_json as Record<string, unknown>) }
          : {}
      siteId.value = typeof report.site === 'string' ? report.site : (report.site as { id?: string })?.id ?? null
      model.value = builderModelFromReport(report as Report & { payload_json?: Record<string, unknown> })
      selectedModuleId.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load report'
      model.value = null
    } finally {
      loading.value = false
    }
  }

  async function save() {
    const rid = idRef.value
    const m = model.value
    if (!rid || !m) return
    saving.value = true
    error.value = null
    try {
      await persistReport(rid, m, rawPayload.value, getHeaders())
      lastSavedAt.value = new Date()
      const refreshed = await getReportById(rid, getHeaders())
      rawPayload.value =
        refreshed.payload_json && typeof refreshed.payload_json === 'object'
          ? { ...(refreshed.payload_json as Record<string, unknown>) }
          : {}
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Save failed'
    } finally {
      saving.value = false
    }
  }

  function selectModule(id: string | null) {
    selectedModuleId.value = id
  }

  function updateReport(patch: Partial<Pick<ReportBuilderModel, 'title' | 'subtitle' | 'internalNotes' | 'theme'>>) {
    if (!model.value) return
    if (patch.title !== undefined) model.value.title = patch.title
    if (patch.subtitle !== undefined) model.value.subtitle = patch.subtitle
    if (patch.internalNotes !== undefined) model.value.internalNotes = patch.internalNotes
    if (patch.theme !== undefined) model.value.theme = { ...model.value.theme, ...patch.theme }
  }

  function setModules(next: ReportModule[]) {
    if (!model.value) return
    model.value.modules = normalizeModuleOrders(next)
  }

  function addModule(arg: LibraryCatalogItem | ReportModuleType) {
    if (!model.value) return
    const order = model.value.modules.length
    const mod =
      typeof arg === 'string'
        ? createModule(arg, order)
        : createModule(arg.type, order, arg.defaultSectionId ? { sectionId: arg.defaultSectionId } : undefined)
    model.value.modules = [...model.value.modules, mod]
    selectedModuleId.value = mod.id
  }

  function removeModule(moduleId: string) {
    if (!model.value) return
    if (!confirm('Remove this block from the report?')) return
    model.value.modules = normalizeModuleOrders(model.value.modules.filter((x) => x.id !== moduleId))
    if (selectedModuleId.value === moduleId) selectedModuleId.value = null
  }

  function dupModule(moduleId: string) {
    if (!model.value) return
    model.value.modules = duplicateModule(model.value.modules, moduleId)
    const added = model.value.modules[model.value.modules.findIndex((x) => x.id === moduleId) + 1]
    if (added) selectedModuleId.value = added.id
  }

  function updateModule(moduleId: string, patch: Record<string, unknown>) {
    if (!model.value) return
    const i = model.value.modules.findIndex((x) => x.id === moduleId)
    if (i < 0) return
    const cur = model.value.modules[i]!
    const nextSettings = { ...(cur.settings as Record<string, unknown>), ...patch } as unknown as ReportModule['settings']
    const next = { ...cur, settings: nextSettings } as ReportModule
    const copy = [...model.value.modules]
    copy[i] = next
    model.value.modules = copy
  }

  function updateModuleTitle(moduleId: string, title: string) {
    if (!model.value) return
    const i = model.value.modules.findIndex((x) => x.id === moduleId)
    if (i < 0) return
    const cur = model.value.modules[i]!
    const copy = [...model.value.modules]
    copy[i] = { ...cur, title } as ReportModule
    model.value.modules = copy
  }

  watch(idRef, () => void load(), { immediate: true })

  return {
    model,
    loading,
    saving,
    error,
    lastSavedAt,
    siteId,
    rawPayload,
    selectedModuleId,
    selectedModule,
    load,
    save,
    selectModule,
    updateReport,
    setModules,
    addModule,
    removeModule,
    dupModule,
    updateModule,
    updateModuleTitle,
  }
}
