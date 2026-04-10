import type { Ref } from 'vue'

/**
 * Headless PDF export (Playwright) waits on `window.__REPORT_READY__ === true`.
 * We must not flip that until the report shell has left the loading state and widgets have time to paint.
 */
export function useReportPdfReady(pending: Ref<boolean>, settleMsAfterContent: number) {
  if (!import.meta.client) return

  const w = () => window as unknown as { __REPORT_READY__?: boolean }

  watch(
    () => pending.value,
    (p) => {
      if (p) {
        w().__REPORT_READY__ = false
        return
      }
      nextTick(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            w().__REPORT_READY__ = true
          }, settleMsAfterContent)
        })
      })
    },
  )
}
