import { CronJob } from 'cron'
import { runLighthouseWeeklyJob } from '~/server/utils/runLighthouseWeeklyJob'

/**
 * Weekly Lighthouse (PageSpeed) for all sites with a domain.
 * Default: Friday 00:00 in LIGHTHOUSE_CRON_TZ (America/Chicago).
 * Enable with LIGHTHOUSE_WEEKLY_CRON_ENABLED=true
 */
export default defineNitroPlugin(() => {
  if (process.env.LIGHTHOUSE_WEEKLY_CRON_ENABLED !== 'true') return

  const tz = process.env.LIGHTHOUSE_CRON_TZ || 'America/Chicago'
  const cronExpr = process.env.LIGHTHOUSE_CRON_EXPRESSION || '0 0 * * 5'

  try {
    const job = new CronJob(
      cronExpr,
      () => {
        void runLighthouseWeeklyJob()
      },
      null,
      true,
      tz,
    )
    console.info(`[lighthouse-cron] enabled (${cronExpr}, ${tz}), running: ${job.running}`)
  } catch (e) {
    console.error(
      '[lighthouse-cron] failed to start (invalid cron expression or timezone?). Set LIGHTHOUSE_WEEKLY_CRON_ENABLED=false to skip.',
      e,
    )
  }
})
