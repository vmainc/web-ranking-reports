import { CronJob } from 'cron'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { getDataForSeoCredentials } from '~/server/utils/dataforseo'
import { getSiteIdsWithRankKeywords, runRankFetchForSite } from '~/server/utils/rankTrackingFetch'

async function runWeeklyRankRefreshAllSites(): Promise<void> {
  const started = Date.now()
  console.info('[rank-tracking-cron] weekly run started')
  const pb = getAdminPb()
  try {
    await adminAuth(pb)
  } catch (e) {
    console.error('[rank-tracking-cron] PocketBase admin auth failed', e)
    return
  }

  const creds = await getDataForSeoCredentials(pb)
  if (!creds) {
    console.warn('[rank-tracking-cron] DataForSEO not configured; skipping weekly refresh')
    return
  }

  const siteIds = await getSiteIdsWithRankKeywords(pb)
  let processed = 0
  for (const siteId of siteIds) {
    try {
      const site = await pb.collection('sites').getOne<{ domain?: string }>(siteId)
      const domain = site.domain?.trim()
      if (!domain) continue
      const { updated, skipReason } = await runRankFetchForSite(pb, siteId, domain, { credentials: creds })
      processed += 1
      console.info(
        `[rank-tracking-cron] site ${siteId}: ${updated} keywords updated${skipReason ? ` (${skipReason})` : ''}`,
      )
    } catch (e) {
      console.error(`[rank-tracking-cron] site ${siteId} failed`, e)
    }
  }

  console.info(
    `[rank-tracking-cron] weekly run finished in ${Date.now() - started}ms (${processed}/${siteIds.length} sites)`,
  )
}

export default defineNitroPlugin(() => {
  if (process.env.RANK_TRACKING_WEEKLY_CRON_ENABLED !== 'true') return

  const tz = process.env.RANK_TRACKING_CRON_TZ || 'America/Chicago'
  const cronExpr = process.env.RANK_TRACKING_CRON_EXPRESSION || '0 0 * * 5'

  try {
    const job = new CronJob(
      cronExpr,
      () => {
        void runWeeklyRankRefreshAllSites()
      },
      null,
      true,
      tz,
    )
    console.info(`[rank-tracking-cron] enabled (${cronExpr}, ${tz}), running: ${job.running}`)
  } catch (e) {
    console.error(
      '[rank-tracking-cron] failed to start (invalid cron expression or timezone?). Rank tracking still works; weekly auto-refresh disabled.',
      e,
    )
  }
})
