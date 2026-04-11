import { CronJob } from 'cron'
import { runProcessEmailCampaignsJob } from '~/server/utils/processEmailCampaignsJob'

/**
 * Sends scheduled / in-progress email campaigns in batches (see processEmailCampaignsJob).
 * Disable with EMAIL_CAMPAIGNS_CRON_ENABLED=false
 */
export default defineNitroPlugin(() => {
  if (process.env.EMAIL_CAMPAIGNS_CRON_ENABLED === 'false') return

  const tz = process.env.EMAIL_CAMPAIGNS_CRON_TZ || 'UTC'
  const expr = process.env.EMAIL_CAMPAIGNS_CRON_EXPRESSION || '*/3 * * * *'

  try {
    const job = new CronJob(
      expr,
      () => {
        void runProcessEmailCampaignsJob()
      },
      null,
      true,
      tz,
    )
    console.info(`[email-campaigns-cron] enabled (${expr}, ${tz}), running: ${job.running}`)
  } catch (e) {
    console.error(
      '[email-campaigns-cron] failed to start (invalid cron or timezone?). Set EMAIL_CAMPAIGNS_CRON_ENABLED=false to skip.',
      e,
    )
  }
})
