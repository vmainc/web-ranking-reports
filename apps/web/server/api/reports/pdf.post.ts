import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { createPdfToken } from '~/server/utils/pdfToken'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as {
    siteId?: string
    rangePreset?: string
    comparePreset?: string
  }
  const siteId = body?.siteId
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const config = useRuntimeConfig()
  const appUrl = ((config.appUrl as string) || 'http://localhost:3000').replace(/\/+$/, '')
  const range = body.rangePreset || 'last_28_days'
  const compare = body.comparePreset !== 'none' ? 'previous_period' : 'none'

  const token = createPdfToken(userId, siteId)
  const reportUrl = `${appUrl}/sites/${siteId}/report?range=${encodeURIComponent(range)}&compare=${encodeURIComponent(compare)}&pdf_token=${encodeURIComponent(token)}`

  let browser: import('playwright').Browser | null = null
  try {
    const { chromium } = await import('playwright')
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.goto(reportUrl, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForFunction('window.__REPORT_READY__ === true', { timeout: 20000 }).catch(() => {
      // continue anyway after timeout
    })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '16px', right: '16px', bottom: '16px', left: '16px' },
    })
    await browser.close()
    browser = null

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="analytics-report.pdf"',
      },
    })
  } catch (e) {
    if (browser) await browser.close().catch(() => {})
    const msg = e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 502, message: `PDF export failed: ${msg}` })
  }
})
