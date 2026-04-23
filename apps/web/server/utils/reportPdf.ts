import { createPdfToken } from '~/server/utils/pdfToken'

export type GenerateReportPdfOpts = {
  userId: string
  siteId: string
  /** Required when `fullReport` is true — renders `/reports/:id/preview` for PDF. */
  reportId?: string
  rangePreset?: string
  comparePreset?: string
  fullReport?: boolean
  /** PocketBase auth token for Playwright localStorage (GA widgets, etc.). */
  authToken?: string
  appUrl: string
}

export type GenerateReportPdfResult = { buffer: Buffer; filename: string }

/**
 * Renders the analytics report page or the saved report preview (`/reports/:id/preview`) in headless Chromium.
 */
export async function generateReportPdfBuffer(opts: GenerateReportPdfOpts): Promise<GenerateReportPdfResult> {
  const range = opts.rangePreset || 'last_28_days'
  const compare = opts.comparePreset !== 'none' ? 'previous_period' : 'none'
  const fullReport = !!opts.fullReport
  const appUrl = opts.appUrl.replace(/\/+$/, '')

  const reportIdTrimmed = typeof opts.reportId === 'string' ? opts.reportId.trim() : ''
  if (fullReport && !reportIdTrimmed) {
    throw createError({ statusCode: 400, message: 'reportId is required for full report PDF export' })
  }

  const token = createPdfToken(opts.userId, opts.siteId)
  const q = new URLSearchParams({ pdf_token: token })
  const reportUrl = fullReport
    ? `${appUrl}/reports/${reportIdTrimmed}/preview?${q.toString()}`
    : (() => {
        q.set('range', range)
        q.set('compare', compare)
        return `${appUrl}/sites/${opts.siteId}/report?${q.toString()}`
      })()

  let browser: import('playwright').Browser | null = null
  try {
    const { chromium } = await import('playwright')
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    if (opts.authToken) {
      await page.addInitScript(
        ({ key, token: t }: { key: string; token: string }) => {
          try {
            if (typeof localStorage !== 'undefined' && t) {
              localStorage.setItem(key, JSON.stringify({ token: t, record: null }))
            }
          } catch {
            // ignore
          }
        },
        { key: 'pocketbase_auth', token: opts.authToken },
      )
    }

    await page.goto(reportUrl, { waitUntil: 'load', timeout: 60000 })
    await page
      .waitForFunction('window.__REPORT_READY__ === true', { timeout: fullReport ? 120000 : 90000 })
      .catch(() => {
        // continue anyway after timeout
      })
    if (fullReport) {
      await page
        .waitForFunction(
          () => {
            const root = document.querySelector('.report-preview-page')
            const text = root?.textContent ?? ''
            return text.length > 20 && !text.includes('Loading')
          },
          { timeout: 60000 },
        )
        .catch(() => {})
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setTimeout(() => resolve(), 1200)
              })
            })
          }),
      )
    }
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '16px', right: '16px', bottom: '16px', left: '16px' },
    })
    await browser.close()
    browser = null

    const filename = fullReport ? 'full-report.pdf' : 'analytics-report.pdf'
    return { buffer: Buffer.from(pdfBuffer), filename }
  } catch (e) {
    if (browser) await browser.close().catch(() => {})
    const msg = e instanceof Error ? e.message : String(e)
    const isBrowserMissing =
      /executable doesn't exist|browser.*not found|could not find chromium|playwright.*install/i.test(msg)
    const hint = isBrowserMissing
      ? ' Server may be missing Chromium (e.g. in Docker). Install with: npx playwright install chromium.'
      : ''
    throw createError({ statusCode: 502, message: `PDF export failed: ${msg}${hint}` })
  }
}
