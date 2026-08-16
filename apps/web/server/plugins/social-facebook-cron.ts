import { CronJob } from 'cron'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { runDueFacebookSync } from '~/server/services/social/syncFacebook'

export const DEFAULT_SOCIAL_FACEBOOK_CRON_EXPRESSION = '0 6 * * *'
export const DEFAULT_SOCIAL_FACEBOOK_CRON_TZ = 'America/Chicago'

async function runScheduledFacebookSync(): Promise<void> {
  const started = Date.now()
  console.info('[social.facebook.sync.started]', { scheduled: true })
  const pb = getAdminPb()
  try {
    await adminAuth(pb)
  } catch (e) {
    console.error('[social.facebook.sync.failed]', { reason: 'admin_auth' })
    return
  }

  try {
    const result = await runDueFacebookSync(pb)
    console.info('[social.facebook.sync.completed]', {
      processed: result.processed,
      failed: result.failed,
      ms: Date.now() - started,
    })
  } catch (e) {
    console.error('[social.facebook.sync.failed]', {
      reason: 'batch',
      message: e instanceof Error ? e.message.slice(0, 200) : 'unknown',
    })
  }
}

export default defineNitroPlugin(() => {
  if (process.env.SOCIAL_FACEBOOK_CRON_ENABLED !== 'true') return

  const tz = process.env.SOCIAL_FACEBOOK_CRON_TZ || DEFAULT_SOCIAL_FACEBOOK_CRON_TZ
  const cronExpr = process.env.SOCIAL_FACEBOOK_CRON_EXPRESSION || DEFAULT_SOCIAL_FACEBOOK_CRON_EXPRESSION

  try {
    const job = new CronJob(
      cronExpr,
      () => {
        void runScheduledFacebookSync()
      },
      null,
      true,
      tz,
    )
    console.info(`[social.facebook.sync] cron enabled (${cronExpr}, ${tz}), running: ${job.running}`)
  } catch (e) {
    console.error('[social.facebook.sync.failed]', { reason: 'cron_start', message: e instanceof Error ? e.message : 'unknown' })
  }
})
