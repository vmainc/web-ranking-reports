import type { Report, SiteRecord } from '~/types'
import type { LibraryCatalogItem, ReportBuilderModel, ReportModule, ReportModuleType } from '~/types/reportBuilder'
import {
  createModule,
  duplicateModule,
  normalizeModuleOrders,
  normalizePageOrders,
  newReportPageId,
} from '~/utils/reportBuilderFactory'
import { getReportById, saveReport as persistReport, builderModelFromReport } from '~/services/reportBuilderService'

function findPageIndexForModule(pages: { modules: ReportModule[] }[], moduleId: string): number {
  return pages.findIndex((p) => p.modules.some((m) => m.id === moduleId))
}

export function useReportBuilder(reportId: MaybeRef<string>, getHeaders: () => Record<string, string>) {
  const idRef = toRef(reportId)

  const loading = ref(true)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const lastSavedAt = ref<Date | null>(null)
  const siteId = ref<string | null>(null)
  const site = ref<SiteRecord | null>(null)
  /** Site workspace owner plan from GET `/api/reports/:id` (for free-tier report chrome). */
  const workspaceOwnerPlan = ref<Report['workspaceOwnerPlan'] | null>(null)

  const model = ref<ReportBuilderModel | null>(null)
  const rawPayload = ref<Record<string, unknown> | undefined>(undefined)

  const selectedPageId = ref<string | null>(null)
  const selectedModuleId = ref<string | null>(null)

  const selectedModule = computed(() => {
    const id = selectedModuleId.value
    if (!id || !model.value) return null
    for (const p of model.value.pages) {
      const m = p.modules.find((x) => x.id === id)
      if (m) return m
    }
    return null
  })

  function pickDefaultPageId() {
    const m = model.value
    if (!m?.pages.length) return null
    const body = m.pages.find((p) => p.title === 'Report body')
    return body?.id ?? m.pages[m.pages.length - 1]!.id
  }

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
      workspaceOwnerPlan.value = null
      const report = (await getReportById(rid, getHeaders())) as Report & {
        payload_json?: Record<string, unknown>
        expand?: { site?: SiteRecord }
      }
      workspaceOwnerPlan.value = report.workspaceOwnerPlan ?? null
      rawPayload.value =
        report.payload_json && typeof report.payload_json === 'object'
          ? { ...(report.payload_json as Record<string, unknown>) }
          : {}
      siteId.value = typeof report.site === 'string' ? report.site : (report.site as { id?: string })?.id ?? null
      site.value = report.expand?.site ?? null
      model.value = builderModelFromReport(report)
      selectedModuleId.value = null
      selectedPageId.value = pickDefaultPageId()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load report'
      model.value = null
      site.value = null
      workspaceOwnerPlan.value = null
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
      const refreshed = (await getReportById(rid, getHeaders())) as Report & { expand?: { site?: SiteRecord } }
      workspaceOwnerPlan.value = refreshed.workspaceOwnerPlan ?? null
      rawPayload.value =
        refreshed.payload_json && typeof refreshed.payload_json === 'object'
          ? { ...(refreshed.payload_json as Record<string, unknown>) }
          : {}
      site.value = refreshed.expand?.site ?? site.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Save failed'
    } finally {
      saving.value = false
    }
  }

  function selectPage(id: string | null) {
    selectedPageId.value = id
  }

  function selectModule(id: string | null) {
    selectedModuleId.value = id
    if (id && model.value) {
      const pi = findPageIndexForModule(model.value.pages, id)
      if (pi >= 0) selectedPageId.value = model.value.pages[pi]!.id
    }
  }

  function updateReport(patch: Partial<Pick<ReportBuilderModel, 'title' | 'subtitle' | 'internalNotes' | 'theme'>>) {
    if (!model.value) return
    if (patch.title !== undefined) model.value.title = patch.title
    if (patch.subtitle !== undefined) model.value.subtitle = patch.subtitle
    if (patch.internalNotes !== undefined) model.value.internalNotes = patch.internalNotes
    if (patch.theme !== undefined) model.value.theme = { ...model.value.theme, ...patch.theme }
  }

  function setModulesForPage(pageId: string, next: ReportModule[]) {
    if (!model.value) return
    const pages = model.value.pages.map((p) =>
      p.id === pageId ? { ...p, modules: normalizeModuleOrders(next) } : p,
    )
    model.value.pages = normalizePageOrders(pages)
  }

  function addModule(arg: LibraryCatalogItem | ReportModuleType) {
    if (!model.value) return
    const pid = selectedPageId.value ?? pickDefaultPageId()
    if (!pid) return
    const page = model.value.pages.find((p) => p.id === pid)
    if (!page) return
    const order = page.modules.length
    const mod =
      typeof arg === 'string'
        ? createModule(arg, order)
        : createModule(arg.type, order, arg.defaultSectionId ? { sectionId: arg.defaultSectionId } : undefined)
    setModulesForPage(pid, [...page.modules, mod])
    selectedModuleId.value = mod.id
  }

  function removeModule(moduleId: string) {
    if (!model.value) return
    if (!confirm('Remove this block from the page?')) return
    const pages = model.value.pages.map((p) => ({
      ...p,
      modules: normalizeModuleOrders(p.modules.filter((x) => x.id !== moduleId)),
    }))
    model.value.pages = normalizePageOrders(pages)
    if (selectedModuleId.value === moduleId) selectedModuleId.value = null
  }

  function dupModule(moduleId: string) {
    if (!model.value) return
    model.value.pages = duplicateModule(model.value.pages, moduleId)
    const pi = findPageIndexForModule(model.value.pages, moduleId)
    if (pi < 0) return
    const page = model.value.pages[pi]!
    const idx = page.modules.findIndex((x) => x.id === moduleId)
    const added = page.modules[idx + 1]
    if (added) selectedModuleId.value = added.id
  }

  function patchModule(moduleId: string, updater: (cur: ReportModule) => ReportModule) {
    if (!model.value) return
    const pages = model.value.pages.map((p) => {
      const i = p.modules.findIndex((x) => x.id === moduleId)
      if (i < 0) return p
      const cur = p.modules[i]!
      const nextM = [...p.modules]
      nextM[i] = updater(cur)
      return { ...p, modules: nextM }
    })
    model.value.pages = normalizePageOrders(pages)
  }

  function updateModule(moduleId: string, patch: Record<string, unknown>) {
    patchModule(moduleId, (cur) => {
      const nextSettings = { ...(cur.settings as Record<string, unknown>), ...patch } as unknown as ReportModule['settings']
      return { ...cur, settings: nextSettings } as ReportModule
    })
  }

  function updateModuleTitle(moduleId: string, title: string) {
    patchModule(moduleId, (cur) => ({ ...cur, title } as ReportModule))
  }

  function updateModulePageBreak(moduleId: string, pageBreakBefore: boolean) {
    patchModule(moduleId, (cur) => ({ ...cur, pageBreakBefore: pageBreakBefore ? true : undefined } as ReportModule))
  }

  function updatePageTitle(pageId: string, title: string) {
    if (!model.value) return
    model.value.pages = normalizePageOrders(
      model.value.pages.map((p) => (p.id === pageId ? { ...p, title } : p)),
    )
  }

  function addPage() {
    if (!model.value) return
    const n = model.value.pages.length + 1
    const page = {
      id: newReportPageId(),
      title: `Page ${n}`,
      order: model.value.pages.length,
      modules: [],
    }
    model.value.pages = normalizePageOrders([...model.value.pages, page])
    selectedPageId.value = page.id
    selectedModuleId.value = null
  }

  function removePage(pageId: string) {
    if (!model.value) return
    if (model.value.pages.length <= 1) {
      alert('Keep at least one page.')
      return
    }
    if (!confirm('Delete this page and all blocks on it?')) return
    model.value.pages = normalizePageOrders(model.value.pages.filter((p) => p.id !== pageId))
    if (selectedPageId.value === pageId) selectedPageId.value = pickDefaultPageId()
    selectedModuleId.value = null
  }

  watch(idRef, () => void load(), { immediate: true })

  return {
    model,
    loading,
    saving,
    error,
    lastSavedAt,
    siteId,
    site,
    workspaceOwnerPlan,
    rawPayload,
    selectedPageId,
    selectedModuleId,
    selectedModule,
    load,
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
  }
}
