import { CronJob } from 'cron'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { getDataForSeoCredentials } from '~/server/utils/dataforseo'
import { getSiteIdsWithRankKeywords, runRankFetchForSite } from '~/server/utils/rankTrackingFetch'
import { isSiteBillingLocked } from '~/server/utils/siteBilling'
import { resolveSiteRankContext } from '~/server/utils/siteRankContext'
import {
  DEFAULT_RANK_TRACKING_CRON_EXPRESSION,
  DEFAULT_RANK_TRACKING_CRON_TZ,
} from '~/server/utils/rankTrackingCronDefaults'

export { DEFAULT_RANK_TRACKING_CRON_EXPRESSION, DEFAULT_RANK_TRACKING_CRON_TZ }

async function runScheduledRankRefreshAllSites(): Promise<void> {
  const started = Date.now()
  console.info('[rank-tracking-cron] scheduled run started')
  const pb = getAdminPb()
  try {
    await adminAuth(pb)
  } catch (e) {
    console.error('[rank-tracking-cron] PocketBase admin auth failed', e)
    return
  }

  const creds = await getDataForSeoCredentials(pb)
  if (!creds) {
    console.warn('[rank-tracking-cron] DataForSEO not configured; skipping scheduled refresh')
    return
  }

  const siteIds = await getSiteIdsWithRankKeywords(pb)
  let processed = 0
  for (const siteId of siteIds) {
    try {
      const site = await pb.collection('sites').getOne(siteId)
      if (isSiteBillingLocked(site as Record<string, unknown>)) continue
      const domain = typeof site.domain === 'string' ? site.domain.trim() : ''
      if (!domain) continue
      const rankContext = resolveSiteRankContext(site)
      const { updated, skipReason } = await runRankFetchForSite(pb, siteId, domain, {
        credentials: creds,
        siteRecord: site,
        rankContext,
      })
      processed += 1
      console.info(
        `[rank-tracking-cron] site ${siteId} (${rankContext.locationName}/${rankContext.device}): ${updated} keywords updated${skipReason ? ` (${skipReason})` : ''}`,
      )
    } catch (e) {
      console.error(`[rank-tracking-cron] site ${siteId} failed`, e)
    }
  }

  console.info(
    `[rank-tracking-cron] scheduled run finished in ${Date.now() - started}ms (${processed}/${siteIds.length} sites)`,
  )
}

export default defineNitroPlugin(() => {
  if (process.env.RANK_TRACKING_WEEKLY_CRON_ENABLED !== 'true') return

  const tz = process.env.RANK_TRACKING_CRON_TZ || DEFAULT_RANK_TRACKING_CRON_TZ
  const cronExpr = process.env.RANK_TRACKING_CRON_EXPRESSION || DEFAULT_RANK_TRACKING_CRON_EXPRESSION

  try {
    const job = new CronJob(
      cronExpr,
      () => {
        void runScheduledRankRefreshAllSites()
      },
      null,
      true,
      tz,
    )
    console.info(`[rank-tracking-cron] enabled (${cronExpr}, ${tz}), running: ${job.running}`)
  } catch (e) {
    console.error(
      '[rank-tracking-cron] failed to start (invalid cron expression or timezone?). Rank tracking still works; scheduled auto-refresh disabled.',
      e,
    )
  }
})
