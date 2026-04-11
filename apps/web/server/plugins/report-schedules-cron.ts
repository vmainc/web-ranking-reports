import { CronJob } from 'cron'
import { runReportSchedulesJob } from '~/server/utils/runReportSchedulesJob'

/**
 * Polls PocketBase every 7 minutes for due `report_schedules` rows.
 * Disable with REPORT_SCHEDULES_CRON_ENABLED=false
 */
export default defineNitroPlugin(() => {
  if (process.env.REPORT_SCHEDULES_CRON_ENABLED === 'false') return

  const tz = process.env.REPORT_SCHEDULES_CRON_TZ || 'UTC'
  const expr = process.env.REPORT_SCHEDULES_CRON_EXPRESSION || '*/7 * * * *'

  try {
    const job = new CronJob(
      expr,
      () => {
        void runReportSchedulesJob()
      },
      null,
      true,
      tz,
    )
    console.info(`[report-schedules-cron] enabled (${expr}, ${tz}), running: ${job.running}`)
  } catch (e) {
    console.error(
      '[report-schedules-cron] failed to start (invalid cron or timezone?). Set REPORT_SCHEDULES_CRON_ENABLED=false to skip.',
      e,
    )
  }
})
