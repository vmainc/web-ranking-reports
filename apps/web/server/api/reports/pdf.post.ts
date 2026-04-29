import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { generateReportPdfBuffer } from '~/server/utils/reportPdf'
import { assertReportOnSite } from '~/server/utils/assertReportOnSite'
import { checkLimit, incrementUsage } from '~/server/services/subscriptions'

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
  if (body.fullReport && !reportIdForPdf) {
    throw createError({ statusCode: 400, message: 'reportId is required when fullReport is true' })
  }
  if (reportIdForPdf) {
    await assertReportOnSite(pb, reportIdForPdf, siteId)
  }

  const limit = await checkLimit(pb, userId, 'reports', 1)
  if (!limit.allowed) {
    const msg = [limit.message, limit.upgradeCta].filter(Boolean).join(' ')
    throw createError({
      statusCode: 402,
      message: msg || 'Report limit reached for this month.',
      data: { code: 'PLAN_LIMIT_REACHED', upgradeCta: limit.upgradeCta },
    })
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
  await incrementUsage(pb, userId, 'reports', 1)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})
