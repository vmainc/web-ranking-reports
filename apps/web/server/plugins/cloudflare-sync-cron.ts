import { CronJob } from 'cron'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { syncCloudflareDataForUser } from '~/server/utils/runCloudflareSyncJob'

async function runCloudflareSyncJob(): Promise<void> {
  const started = Date.now()
  const pb = getAdminPb()
  try {
    await adminAuth(pb)
  } catch (e) {
    console.error('[cloudflare-sync-cron] PocketBase admin auth failed', e)
    return
  }

  const integrations = await pb.collection('cloudflare_integrations').getFullList<{ user?: string; connected?: boolean }>({
    filter: 'connected = true',
    sort: '-updated',
  }).catch(() => [])

  const userIds = [...new Set(integrations.map((r) => (typeof r.user === 'string' ? r.user : '')).filter(Boolean))]
  if (!userIds.length) return

  let ok = 0
  for (const userId of userIds) {
    try {
      const res = await syncCloudflareDataForUser(pb, userId)
      ok += 1
      console.info(`[cloudflare-sync-cron] synced user=${userId} zones=${res.zones}`)
    } catch (e) {
      console.error(`[cloudflare-sync-cron] user=${userId} sync failed`, e)
    }
  }

  console.info(`[cloudflare-sync-cron] finished in ${Date.now() - started}ms (${ok}/${userIds.length} users)`)
}

/**
 * Periodic Cloudflare sync.
 * Disable with CLOUDFLARE_SYNC_CRON_ENABLED=false
 */
export default defineNitroPlugin(() => {
  if (process.env.CLOUDFLARE_SYNC_CRON_ENABLED === 'false') return

  const tz = process.env.CLOUDFLARE_SYNC_CRON_TZ || 'UTC'
  const expr = process.env.CLOUDFLARE_SYNC_CRON_EXPRESSION || '17 */6 * * *'

  try {
    const job = new CronJob(
      expr,
      () => {
        void runCloudflareSyncJob()
      },
      null,
      true,
      tz,
    )
    console.info(`[cloudflare-sync-cron] enabled (${expr}, ${tz}), running: ${job.running}`)
  } catch (e) {
    console.error(
      '[cloudflare-sync-cron] failed to start (invalid cron or timezone?). Set CLOUDFLARE_SYNC_CRON_ENABLED=false to skip.',
      e,
    )
  }
})

