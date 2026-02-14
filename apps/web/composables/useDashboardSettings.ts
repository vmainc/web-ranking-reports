import { DEFAULT_LAYOUT } from '~/utils/dashboardLayout'
import type { WidgetId } from '~/utils/dashboardLayout'

export interface DashboardWidget {
  id: WidgetId
  enabled: boolean
  order: number
  settings: Record<string, unknown>
}

export interface DashboardLayout {
  version: number
  widgets: DashboardWidget[]
  dateRange: { preset: string }
  compareTo: { enabled: boolean; preset: string }
}

function defaultLayout(): DashboardLayout {
  return JSON.parse(JSON.stringify(DEFAULT_LAYOUT)) as DashboardLayout
}

export function useDashboardSettings(siteId: Ref<string> | string) {
  const id = typeof siteId === 'string' ? ref(siteId) : siteId
  const pb = usePocketbase()
  const layout = ref<DashboardLayout | null>(null)
  const recordId = ref<string | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  /** Skip API call when collection is known missing (404) to avoid repeated 404s in console */
  const collectionMissing = ref(false)

  async function load() {
    if (!id.value) return
    // Avoid blocking SSR: PB and cookies aren't available the same way; skip load on server.
    if (import.meta.server) return
    if (collectionMissing.value) {
      layout.value = defaultLayout()
      recordId.value = null
      return
    }
    loading.value = true
    try {
      const list = await pb.collection('site_dashboard_settings').getFullList<{ id: string; layout_json: DashboardLayout }>({
        filter: `site = "${id.value}"`,
      })
      if (list[0]) {
        collectionMissing.value = false
        recordId.value = list[0].id
        layout.value = list[0].layout_json ?? defaultLayout()
      } else {
        layout.value = defaultLayout()
        recordId.value = null
      }
    } catch (err: unknown) {
      const is404 = err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404
      if (is404) collectionMissing.value = true
      layout.value = defaultLayout()
      recordId.value = null
    } finally {
      loading.value = false
    }
  }

  async function save() {
    if (!id.value || !layout.value) return
    saving.value = true
    try {
      const payload = { layout_json: layout.value, updated_at: new Date().toISOString() }
      if (recordId.value) {
        await pb.collection('site_dashboard_settings').update(recordId.value, payload)
      } else {
        const created = await pb.collection('site_dashboard_settings').create({
          site: id.value,
          ...payload,
        })
        recordId.value = (created as { id: string }).id
        collectionMissing.value = false
      }
    } catch (err: unknown) {
      // 404 = collection missing; use default layout in memory only, don't throw
      const is404 = err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404
      if (is404) {
        recordId.value = null
        collectionMissing.value = true
      } else {
        throw err
      }
    } finally {
      saving.value = false
    }
  }

  function setWidgetEnabled(widgetId: WidgetId, enabled: boolean) {
    if (!layout.value) return
    const w = layout.value.widgets.find((x) => x.id === widgetId)
    if (w) w.enabled = enabled
  }

  function moveWidget(widgetId: WidgetId, direction: 'up' | 'down') {
    if (!layout.value) return
    const list = layout.value.widgets.filter((x) => x.enabled)
    const idx = list.findIndex((x) => x.id === widgetId)
    if (idx < 0) return
    const newIdx = direction === 'up' ? Math.max(0, idx - 1) : Math.min(list.length - 1, idx + 1)
    if (newIdx === idx) return
    const [item] = list.splice(idx, 1)
    list.splice(newIdx, 0, item)
    list.forEach((w, i) => { w.order = (i + 1) * 10 })
    layout.value.widgets.forEach((w) => {
      const o = list.findIndex((x) => x.id === w.id)
      if (o >= 0) w.order = list[o].order
    })
  }

  function resetToDefaults() {
    layout.value = defaultLayout()
  }

  const enabledWidgets = computed(() => {
    if (!layout.value) return []
    return [...layout.value.widgets.filter((w) => w.enabled)].sort((a, b) => a.order - b.order)
  })

  watch(id, load, { immediate: true })

  return {
    layout,
    loading,
    saving,
    enabledWidgets,
    load,
    save,
    setWidgetEnabled,
    moveWidget,
    resetToDefaults,
  }
}
