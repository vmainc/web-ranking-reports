export function useExportPdf(siteId: Ref<string> | string) {
  const id = typeof siteId === 'string' ? ref(siteId) : siteId
  const pb = usePocketbase()
  const exporting = ref(false)
  const error = ref('')

  async function exportPdf(
    rangePreset = 'last_28_days',
    comparePreset = 'previous_period',
    fullReport = false
  ) {
    if (!id.value) return
    exporting.value = true
    error.value = ''
    try {
      const token = pb.authStore.token
      const blob = await $fetch<Blob>('/api/reports/pdf', {
        method: 'POST',
        body: {
          siteId: id.value,
          rangePreset,
          comparePreset,
          fullReport,
          authToken: token || undefined,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        responseType: 'blob',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fullReport ? 'full-report.pdf' : 'analytics-report.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      const err = e as {
        data?: { message?: string } | Blob
        message?: string
        statusMessage?: string
      }
      let msg = err?.message ?? err?.statusMessage ?? 'Export failed'
      if (err?.data) {
        if (typeof (err.data as { message?: string }).message === 'string') {
          msg = (err.data as { message: string }).message
        } else if (err.data instanceof Blob) {
          try {
            const text = await err.data.text()
            const j = JSON.parse(text) as { message?: string }
            if (typeof j?.message === 'string') msg = j.message
          } catch {
            // keep default msg
          }
        }
      }
      error.value = msg
    } finally {
      exporting.value = false
    }
  }

  return { exportPdf, exporting, error }
}
