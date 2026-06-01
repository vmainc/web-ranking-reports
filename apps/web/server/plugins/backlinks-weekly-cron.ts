import { CronJob } from 'cron'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import {
  getBacklinksBulkJobMeta,
  runBacklinksWeeklyJob,
} from '~/server/utils/runBacklinksWeeklyJob'

/**
 * Weekly DataForSEO backlink profile refresh for all sites with a domain.
 * Default: Friday 00:00 in BACKLINKS_CRON_TZ (America/Chicago).
 * Enable with BACKLINKS_WEEKLY_CRON_ENABLED=true
 *
 * One-time bootstrap for all existing sites on deploy:
 * BACKLINKS_BOOTSTRAP_ON_START=true (skips if already completed unless BACKLINKS_FORCE_BOOTSTRAP=true)
 */
async function maybeRunBootstrap(): Promise<void> {
  if (process.env.BACKLINKS_BOOTSTRAP_ON_START !== 'true') return

  const force = process.env.BACKLINKS_FORCE_BOOTSTRAP === 'true'
  const pb = getAdminPb()
  try {
    await adminAuth(pb)
  } catch (e) {
    console.error('[backlinks-cron] bootstrap: PocketBase admin auth failed', e)
    return
  }

  if (!force) {
    const meta = await getBacklinksBulkJobMeta(pb)
    if (meta.bootstrapCompletedAt) {
      console.info(
        `[backlinks-cron] bootstrap already completed at ${meta.bootstrapCompletedAt}; set BACKLINKS_FORCE_BOOTSTRAP=true to rerun`,
      )
      return
    }
  }

  console.info('[backlinks-cron] bootstrap starting (all sites with a domain)')
  await runBacklinksWeeklyJob('bootstrap')
}

export default defineNitroPlugin(() => {
  const bootstrapDelayMs = Math.max(0, Number(process.env.BACKLINKS_BOOTSTRAP_DELAY_MS ?? 60_000) || 60_000)

  if (process.env.BACKLINKS_BOOTSTRAP_ON_START === 'true') {
    setTimeout(() => {
      void maybeRunBootstrap()
    }, bootstrapDelayMs)
    console.info(`[backlinks-cron] bootstrap scheduled in ${bootstrapDelayMs}ms`)
  }

  if (process.env.BACKLINKS_WEEKLY_CRON_ENABLED !== 'true') return

  const tz = process.env.BACKLINKS_CRON_TZ || 'America/Chicago'
  const cronExpr = process.env.BACKLINKS_CRON_EXPRESSION || '0 0 * * 5'

  try {
    const job = new CronJob(
      cronExpr,
      () => {
        void runBacklinksWeeklyJob('weekly')
      },
      null,
      true,
      tz,
    )
    console.info(`[backlinks-cron] weekly enabled (${cronExpr}, ${tz}), running: ${job.running}`)
  } catch (e) {
    console.error(
      '[backlinks-cron] failed to start weekly cron (invalid expression or timezone?). Set BACKLINKS_WEEKLY_CRON_ENABLED=false to skip.',
      e,
    )
  }
})
