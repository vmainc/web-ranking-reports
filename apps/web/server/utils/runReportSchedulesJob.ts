import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { computeNextRunUtc, type ReportScheduleFrequency } from '~/server/utils/reportScheduleTime'
import { generateAutomatedReport } from '~/server/utils/automatedReportGenerate'

type ScheduleRow = {
  id: string
  site: string
  frequency: string
  start_at: string
  last_run_at?: string | null
  next_run_at: string
  is_active?: boolean
}

/**
 * Cron worker: run due report_schedules, generate automated reports, advance next_run_at.
 */
export async function runReportSchedulesJob(): Promise<void> {
  const started = Date.now()
  const now = new Date()
  const nowIso = now.toISOString()

  const pb = getAdminPb()
  try {
    await adminAuth(pb)
  } catch (e) {
    console.error('[report-schedules-cron] PocketBase admin auth failed', e)
    return
  }

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
    try {
      const site = await pb.collection('sites').getOne<{ user?: string }>(siteId)
      ownerUserId = typeof site.user === 'string' ? site.user : null
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
      await generateAutomatedReport(pb, siteId)
    } catch (e) {
      console.error(`[report-schedules-cron] generate failed site=${siteId}`, e)
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
