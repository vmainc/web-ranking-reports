import { readBody, getHeader } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { generateReportPdfBuffer } from '~/server/utils/reportPdf'
import { assertReportOnSite } from '~/server/utils/assertReportOnSite'
import { emailFailureUserMessage } from '~/server/utils/emailFailureUserMessage'
import { checkLimit, incrementUsage } from '~/server/services/subscriptions'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { logCrmReportSent } from '~/server/utils/logCrmReportSent'
import {
  deliveryEmailFromReportPayload,
  resolveReportDeliveryEmail,
} from '~/server/utils/reportDeliveryEmail'
import { mergeDeliveryEmailSettings } from '~/utils/reportDeliveryEmail'
import { sendReportViaAgencyProvider } from '~/server/services/email/sendReportViaAgencyProvider'
import { EmailDeliveryError } from '~/server/services/email/types'
import { getAgencyEmailIntegration } from '~/server/services/email/agencyEmailIntegration'

function rangeLabel(range: string, compare: string): string {
  const c = compare !== 'none' ? ' (vs previous period)' : ''
  if (range === 'last_7_days') return 'Last 7 days' + c
  if (range === 'last_28_days') return 'Last 28 days' + c
  if (range === 'last_90_days') return 'Last 90 days' + c
  return range + c
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = event.context.params?.id
  if (!siteId) throw createError({ statusCode: 400, message: 'Missing site id' })

  const body = (await readBody(event).catch(() => ({}))) as {
    to?: string
    range?: string
    compare?: string
    fullReport?: boolean
    reportId?: string
  }

  const range = typeof body.range === 'string' && body.range ? body.range : 'last_28_days'
  const compareRaw = typeof body.compare === 'string' ? body.compare : 'previous_period'
  const compare = compareRaw === 'none' ? 'none' : 'previous_period'
  const fullReport = body.fullReport === true

  const pb = getAdminPb()
  await adminAuth(pb)

  const { site, canWrite } = await assertSiteAccess(pb, siteId, userId, false)

  const userRecord = (await pb.collection('users').getOne(userId)) as { email?: string }
  const userEmail = typeof userRecord.email === 'string' ? userRecord.email.trim().toLowerCase() : ''

  let to = typeof body.to === 'string' ? body.to.trim().toLowerCase() : ''
  if (!to) to = userEmail
  if (!to || !to.includes('@')) {
    throw createError({ statusCode: 400, message: 'Valid recipient email is required.' })
  }
  if (!canWrite && to !== userEmail) {
    throw createError({ statusCode: 403, message: 'You can only email the report to your own address.' })
  }

  const config = useRuntimeConfig()
  const appUrl = String(config.public?.appUrl || config.appUrl || 'http://localhost:3000').replace(/\/+$/, '')
  let appName = 'Web Ranking Reports'
  try {
    const s = (await pb.settings.getAll()) as { meta?: { appName?: string } }
    if (s.meta?.appName) appName = s.meta.appName
  } catch {
    // ignore
  }

  const authHeader = getHeader(event, 'authorization')
  const bearer =
    typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : ''
  const authToken = bearer || undefined

  const reportIdForPdf =
    typeof body.reportId === 'string' && body.reportId.trim() ? body.reportId.trim() : ''
  if (fullReport && !reportIdForPdf) {
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

  let reportTitle = `${site.name} — ${rangeLabel(range, compare)}`
  let deliverySettings = mergeDeliveryEmailSettings(null)
  let themeLogoUrl = ''

  if (reportIdForPdf) {
    try {
      const row = await pb.collection('reports').getOne<{ payload_json?: unknown }>(reportIdForPdf, {
        fields: 'payload_json',
      })
      deliverySettings = deliveryEmailFromReportPayload(row.payload_json)
      const pj = row.payload_json
      if (pj && typeof pj === 'object' && !Array.isArray(pj)) {
        const rb = (pj as Record<string, unknown>).reportBuilder
        if (rb && typeof rb === 'object' && !Array.isArray(rb)) {
          const t = (rb as Record<string, unknown>).title
          if (typeof t === 'string' && t.trim()) reportTitle = t.trim()
          const theme = (rb as Record<string, unknown>).theme
          if (theme && typeof theme === 'object' && !Array.isArray(theme)) {
            const lu = (theme as Record<string, unknown>).logoUrl
            if (typeof lu === 'string') themeLogoUrl = lu.trim()
          }
        }
      }
    } catch {
      // use defaults
    }
  }

  const resolved = resolveReportDeliveryEmail({
    settings: { ...deliverySettings, showOpenLink: false },
    siteName: site.name,
    reportTitle,
    themeLogoUrl,
    appName,
  })
  const subject = resolved.subject
  const html = resolved.html
  const text = resolved.text

  const { buffer: pdfBuffer, filename: pdfFilename } = await generateReportPdfBuffer({
    userId,
    siteId,
    reportId: reportIdForPdf || undefined,
    rangePreset: range,
    comparePreset: compare,
    fullReport,
    authToken,
    appUrl,
  })
  await incrementUsage(pb, userId, 'reports', 1)

  const agencyOwnerId = await requireCrmOwnerId(pb, userId)

  // Prefer agency Email Sending defaults when schedule/report did not set a display name / reply-to
  let fromName: string | undefined
  let replyTo: string | undefined
  try {
    const integ = await getAgencyEmailIntegration(pb, agencyOwnerId)
    if (integ?.sender_name?.trim()) fromName = integ.sender_name.trim()
    if (integ?.reply_to_email?.trim()) replyTo = integ.reply_to_email.trim()
  } catch {
    // ignore
  }

  try {
    await sendReportViaAgencyProvider(pb, {
      agencyOwnerId,
      reportId: reportIdForPdf || undefined,
      to,
      subject,
      html,
      text,
      fromName,
      replyTo,
      attachments: [{ filename: pdfFilename, content: pdfBuffer, contentType: 'application/pdf' }],
    })
  } catch (e: unknown) {
    if (e instanceof EmailDeliveryError) {
      return { ok: true, emailSent: false, warning: e.userMessage }
    }
    return { ok: true, emailSent: false, warning: emailFailureUserMessage(e, 'report') }
  }

  try {
    const crmOwnerId = agencyOwnerId
    await logCrmReportSent(pb, {
      crmOwnerId,
      siteId,
      recipientEmail: to,
      reportLabel: reportTitle,
    })
  } catch {
    // CRM logging is best-effort
  }

  return { ok: true, emailSent: true, to }
})
