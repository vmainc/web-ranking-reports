export function useExportPdf(siteId: Ref<string> | string) {
  const id = typeof siteId === 'string' ? ref(siteId) : siteId
  const pb = usePocketbase()
  const exporting = ref(false)
  const error = ref('')

  async function exportPdf(rangePreset = 'last_28_days', comparePreset = 'previous_period') {
    if (!id.value) return
    exporting.value = true
    error.value = ''
    try {
      const token = pb.authStore.token
      const blob = await $fetch<Blob>('/api/reports/pdf', {
        method: 'POST',
        body: { siteId: id.value, rangePreset, comparePreset },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        responseType: 'blob',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'analytics-report.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string; statusMessage?: string }
      error.value = err?.data?.message ?? err?.message ?? err?.statusMessage ?? 'Export failed'
    } finally {
      exporting.value = false
    }
  }

  return { exportPdf, exporting, error }
}
