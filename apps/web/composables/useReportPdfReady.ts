import type { Ref } from 'vue'

export type ReportPdfReadyOptions = {
  /**
   * Poll the report DOM until "Loading" no longer appears (GA widgets, etc.).
   * `settleMsAfterContent` is treated as a max wait when this is enabled.
   */
  pollUntilNoLoading?: boolean
  /** Root element to scan (default `.full-report-page`). */
  rootSelector?: string
  /** Extra ms after loading clears before setting ready (ECharts paint). */
  chartSettleMs?: number
}

/**
 * Headless PDF export (Playwright) waits on `window.__REPORT_READY__ === true`.
 * The report shell's `pending` ref only covers init(); dashboard widgets load
 * afterward and may still show "Loading…" — use `pollUntilNoLoading` on full-report.
 */
export function useReportPdfReady(
  pending: Ref<boolean>,
  settleMsAfterContent: number,
  opts?: ReportPdfReadyOptions,
) {
  if (!import.meta.client) return

  const w = () => window as unknown as { __REPORT_READY__?: boolean }
  const rootSelector = opts?.rootSelector ?? '.full-report-page'
  const chartSettleMs = opts?.chartSettleMs ?? 2200

  function markReadyAfterPaint() {
    nextTick(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          w().__REPORT_READY__ = true
        }, chartSettleMs)
      })
    })
  }

  watch(
    () => pending.value,
    async (p) => {
      if (p) {
        w().__REPORT_READY__ = false
        return
      }

      if (!opts?.pollUntilNoLoading) {
        nextTick(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              w().__REPORT_READY__ = true
            }, settleMsAfterContent)
          })
        })
        return
      }

      const deadline = Date.now() + settleMsAfterContent
      const stepMs = 400

      await nextTick()

      while (Date.now() < deadline) {
        const root = document.querySelector(rootSelector)
        const text = root?.textContent ?? ''
        // Avoid flipping ready before the report root exists or has rendered body text.
        if (root && text.trim().length > 20 && !text.includes('Loading')) {
          markReadyAfterPaint()
          return
        }
        await new Promise((r) => setTimeout(r, stepMs))
      }

      markReadyAfterPaint()
    },
  )
}
