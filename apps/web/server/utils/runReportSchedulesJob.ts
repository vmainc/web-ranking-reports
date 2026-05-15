import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { computeNextRunUtc, type ReportScheduleFrequency } from '~/server/utils/reportScheduleTime'
import { generateAutomatedReport } from '~/server/utils/automatedReportGenerate'
import { sendHtmlEmail } from '~/server/utils/smtpSend'
import { getReportScheduleFieldNames, pickSchedulePatch } from '~/server/utils/reportScheduleTracking'
import { generateReportPdfBuffer } from '~/server/utils/reportPdf'
import { logCrmReportSent } from '~/server/utils/logCrmReportSent'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

type ScheduleRow = {
  id: string
  site: string
  report?: string
  frequency: string
  start_at: string
  last_run_at?: string | null
  next_run_at: string
  from_email?: string | null
  to_email?: string | null
  sender_name?: string | null
  email_subject?: string | null
  is_active?: boolean
}

function renderTemplate(input: string, vars: Record<string, string>): string {
  let out = input
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi'), v)
  }
  return out
}

/**
 * Cron worker: run due report_schedules, generate automated reports, advance next_run_at.
 */
export async function runReportSchedulesJob(): Promise<void> {
  const started = Date.now()
  const now = new Date()
  const nowIso = now.toISOString()

  const pb = getAdminPb()
  const config = useRuntimeConfig()
  try {
    await adminAuth(pb)
  } catch (e) {
    console.error('[report-schedules-cron] PocketBase admin auth failed', e)
    return
  }
  const fieldNames = await getReportScheduleFieldNames(pb)
  const appUrl = String(config.public?.appUrl || config.appUrl || 'http://localhost:3000').replace(/\/+$/, '')

  let list: ScheduleRow[] = []
  try {
    list = await pb.collection('report_schedules').getFullList<ScheduleRow>({
      filter: `is_active = true && next_run_at <= ${JSON.stringify(nowIso)}`,
      batch: 100,
    })
  } catch (e) {
    console.warn('[report-schedules-cron] report_schedules query failed (collection missing?)', e)
    return
  }

  if (!list.length) {
    return
  }

  console.info(`[report-schedules-cron] ${list.length} due schedule(s)`)

  for (const row of list) {
    const siteId = typeof row.site === 'string' ? row.site : ''
    const freq = row.frequency as ReportScheduleFrequency
    if (!siteId || !['daily', 'weekly', 'monthly'].includes(freq)) {
      console.warn(`[report-schedules-cron] skip invalid row ${row.id}`)
      continue
    }

    let ownerUserId: string | null = null
    let siteName = 'Website'
    try {
      const site = await pb.collection('sites').getOne<{ user?: string; name?: string }>(siteId)
      ownerUserId = typeof site.user === 'string' ? site.user : null
      siteName = typeof site.name === 'string' && site.name.trim() ? site.name.trim() : 'Website'
    } catch {
      console.warn(`[report-schedules-cron] site ${siteId} missing; deactivating schedule ${row.id}`)
      try {
        await pb.collection('report_schedules').update(row.id, { is_active: false })
      } catch {
        // ignore
      }
      continue
    }

    if (!ownerUserId) continue

    try {
      await assertSiteAccess(pb, siteId, ownerUserId, false)
    } catch {
      continue
    }

    try {
      const { reportId } = await generateAutomatedReport(pb, siteId)
      const to = typeof row.to_email === 'string' ? row.to_email.trim() : ''
      if (to && to.includes('@')) {
        const token = `${reportId}_${Math.random().toString(36).slice(2, 12)}`
        const openEmailUrl = `${appUrl}/api/reports/schedules/track/open-email?token=${encodeURIComponent(token)}`
        const openReportUrl = `${appUrl}/api/reports/schedules/track/open-report?token=${encodeURIComponent(token)}`
        const siteNameEsc = escapeHtml(siteName)
        const dateLabel = new Date().toLocaleDateString('en-US')
        const senderNameRaw = typeof row.sender_name === 'string' ? row.sender_name.trim() : ''
        const senderName = senderNameRaw || siteName
        const subjectRaw = typeof row.email_subject === 'string' ? row.email_subject.trim() : ''
        const defaultSubject = 'Scheduled report: {{site}}'
        const subject = renderTemplate(subjectRaw || defaultSubject, { site: siteName, date: dateLabel }).slice(0, 200)
        const replyTo = typeof row.from_email === 'string' ? row.from_email.trim() : ''
        let pdfAttachment:
          | { filename: string; content: Buffer; contentType: string }
          | undefined
        try {
          const { buffer, filename } = await generateReportPdfBuffer({
            userId: ownerUserId,
            siteId,
            reportId,
            fullReport: true,
            appUrl,
          })
          const cleanSite = siteName.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase() || 'report'
          const datePart = new Date().toISOString().slice(0, 10)
          pdfAttachment = {
            filename: `${cleanSite}-${datePart}.pdf`,
            content: buffer,
            contentType: 'application/pdf',
          }
          if (!filename) {
            // no-op: keep deterministic filename above
          }
        } catch (pdfErr) {
          const pdfErrText = pdfErr instanceof Error ? pdfErr.message.slice(0, 300) : 'PDF attachment generation failed'
          console.warn(`[report-schedules-cron] PDF attachment failed for schedule=${row.id}: ${pdfErrText}`)
        }
        const html = `<p>Hi,</p>
<p>Your scheduled report for <strong>${siteNameEsc}</strong> is ready.</p>
<p>The PDF report is attached to this email.</p>
<p><a href="${openReportUrl}">Open report</a></p>
<img src="${openEmailUrl}" alt="" width="1" height="1" style="display:block;width:1px;height:1px;" />`
        try {
          await sendHtmlEmail({
            to,
            subject,
            html,
            text: `Your scheduled report for ${siteName} is ready. Open: ${openReportUrl}`,
            fromName: senderName,
            ...(replyTo ? { replyTo } : {}),
            ...(pdfAttachment ? { attachments: [pdfAttachment] } : {}),
          })
          await logCrmReportSent(pb, {
            crmOwnerId: ownerUserId,
            siteId,
            recipientEmail: to,
            reportLabel: subject || `Scheduled report: ${siteName}`,
          }).catch(() => {})
          const okPatch = pickSchedulePatch(fieldNames, {
            last_delivery_status: 'delivered',
            last_delivery_error: '',
            last_delivery_at: new Date().toISOString(),
            last_delivery_report_id: reportId,
            last_tracking_token: token,
            last_email_opened_at: null,
            last_report_opened_at: null,
          })
          if (Object.keys(okPatch).length) {
            await pb.collection('report_schedules').update(row.id, okPatch).catch(() => {})
          }
        } catch (mailErr) {
          const errText = mailErr instanceof Error ? mailErr.message.slice(0, 300) : 'Email send failed'
          const failPatch = pickSchedulePatch(fieldNames, {
            last_delivery_status: 'failed',
            last_delivery_error: errText,
            last_delivery_at: new Date().toISOString(),
            last_delivery_report_id: reportId,
          })
          if (Object.keys(failPatch).length) {
            await pb.collection('report_schedules').update(row.id, failPatch).catch(() => {})
          }
        }
      }
    } catch (e) {
      console.error(`[report-schedules-cron] generate failed site=${siteId}`, e)
      const errText = e instanceof Error ? e.message.slice(0, 300) : 'Schedule run failed'
      const failPatch = pickSchedulePatch(fieldNames, {
        last_delivery_status: 'failed',
        last_delivery_error: errText,
        last_delivery_at: new Date().toISOString(),
      })
      if (Object.keys(failPatch).length) {
        await pb.collection('report_schedules').update(row.id, failPatch).catch(() => {})
      }
      // Still advance schedule to avoid stuck retries piling up; ops can inspect logs.
    }

    const lastRun = new Date()
    const next = computeNextRunUtc(lastRun, freq)

    try {
      await pb.collection('report_schedules').update(row.id, {
        last_run_at: lastRun.toISOString(),
        next_run_at: next.toISOString(),
      })
    } catch (e) {
      console.error(`[report-schedules-cron] update schedule ${row.id} failed`, e)
    }
  }

  console.info(`[report-schedules-cron] finished in ${Date.now() - started}ms`)
}
