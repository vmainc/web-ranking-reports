import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { generateReportPdfBuffer } from '~/server/utils/reportPdf'
import { assertReportOnSite } from '~/server/utils/assertReportOnSite'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as {
    siteId?: string
    reportId?: string
    rangePreset?: string
    comparePreset?: string
    fullReport?: boolean
    authToken?: string
  }
  const siteId = body?.siteId
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })
  const authToken = typeof body?.authToken === 'string' ? body.authToken : undefined

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const reportIdForPdf =
    typeof body.reportId === 'string' && body.reportId.trim() ? body.reportId.trim() : ''
  if (reportIdForPdf) {
    await assertReportOnSite(pb, reportIdForPdf, siteId)
  }

  const config = useRuntimeConfig()
  const appUrl = ((config.appUrl as string) || 'http://localhost:3000').replace(/\/+$/, '')

  const { buffer, filename } = await generateReportPdfBuffer({
    userId,
    siteId,
    reportId: reportIdForPdf || undefined,
    rangePreset: body.rangePreset,
    comparePreset: body.comparePreset,
    fullReport: body.fullReport,
    authToken,
    appUrl,
  })

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})
