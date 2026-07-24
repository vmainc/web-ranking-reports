export type GenerateProposalPdfOpts = {
  appUrl: string
  publicToken: string
  title?: string
}

export type GenerateProposalPdfResult = { buffer: Buffer; filename: string }

/**
 * Renders the public proposal PDF layout in headless Chromium.
 * Does not increment monthly report usage.
 */
export async function generateProposalPdfBuffer(opts: GenerateProposalPdfOpts): Promise<GenerateProposalPdfResult> {
  const appUrl = opts.appUrl.replace(/\/+$/, '')
  const token = opts.publicToken.trim()
  if (!token) throw createError({ statusCode: 400, message: 'publicToken is required' })

  const pdfUrl = `${appUrl}/p/${encodeURIComponent(token)}/pdf`

  let browser: import('playwright').Browser | null = null
  try {
    const { chromium } = await import('playwright')
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.goto(pdfUrl, { waitUntil: 'load', timeout: 60000 })
    await page.waitForFunction('window.__PROPOSAL_PDF_READY__ === true', { timeout: 60000 }).catch(() => {})
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTimeout(() => resolve(), 400)
            })
          })
        }),
    )
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18px', right: '18px', bottom: '18px', left: '18px' },
    })
    await browser.close()
    browser = null

    const safeTitle = (opts.title || 'proposal')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48)
    return { buffer: Buffer.from(pdfBuffer), filename: `${safeTitle || 'proposal'}.pdf` }
  } catch (e) {
    if (browser) await browser.close().catch(() => {})
    const msg = e instanceof Error ? e.message : String(e)
    const isBrowserMissing =
      /executable doesn't exist|browser.*not found|could not find chromium|playwright.*install/i.test(msg)
    const hint = isBrowserMissing
      ? ' Server may be missing Chromium. Install with: npx playwright install chromium.'
      : ''
    throw createError({ statusCode: 502, message: `Proposal PDF export failed: ${msg}${hint}` })
  }
}
