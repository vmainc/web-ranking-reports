import { readBody, getHeader } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { sendHtmlEmail } from '~/server/utils/smtpSend'
import { generateReportPdfBuffer } from '~/server/utils/reportPdf'
import { emailFailureUserMessage } from '~/server/utils/emailFailureUserMessage'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

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

  const reportTitle = `${site.name} — ${rangeLabel(range, compare)}`
  const subject = `Report PDF: ${reportTitle}`
  const siteNameEsc = escapeHtml(site.name)
  const titleEsc = escapeHtml(reportTitle)
  const appNameEsc = escapeHtml(appName)
  const html = `<p>Hi,</p>
<p>The report for <strong>${siteNameEsc}</strong> is attached as a PDF (${titleEsc}).</p>
<p style="color:#71717a;font-size:12px;margin-top:1.5em;">Sent from ${appNameEsc}.</p>`
  const text = `The report for ${site.name} is attached as a PDF (${reportTitle}). Sent from ${appName}.`

  const { buffer: pdfBuffer, filename: pdfFilename } = await generateReportPdfBuffer({
    userId,
    siteId,
    rangePreset: range,
    comparePreset: compare,
    fullReport,
    authToken,
    appUrl,
  })

  try {
    await sendHtmlEmail({
      to,
      subject,
      html,
      text,
      attachments: [{ filename: pdfFilename, content: pdfBuffer, contentType: 'application/pdf' }],
    })
  } catch (e: unknown) {
    return { ok: true, emailSent: false, warning: emailFailureUserMessage(e, 'report') }
  }

  return { ok: true, emailSent: true, to }
})
