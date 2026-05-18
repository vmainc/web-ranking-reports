import type PocketBase from 'pocketbase'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { runLighthouseForSite } from '~/server/utils/lighthouse'
import { isSiteBillingLocked } from '~/server/utils/siteBilling'

export type LighthouseWeeklyStrategy = 'mobile' | 'desktop'

async function getSiteIdsWithDomains(pb: PocketBase): Promise<string[]> {
  const sites = await pb.collection('sites').getFullList<{ id: string; domain?: string }>({
    fields: 'id,domain',
    batch: 100,
  })
  return sites.filter((s) => typeof s.domain === 'string' && s.domain.trim()).map((s) => s.id)
}

export function parseLighthouseWeeklyStrategies(raw: string | undefined): LighthouseWeeklyStrategy[] {
  const allowed: LighthouseWeeklyStrategy[] = ['mobile', 'desktop']
  const parts = (raw ?? 'mobile,desktop')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is LighthouseWeeklyStrategy => s === 'mobile' || s === 'desktop')
  return parts.length ? parts : allowed
}

/** Run Lighthouse for every site with a domain (skips billing-locked sites). */
export async function runLighthouseWeeklyJob(): Promise<void> {
  const started = Date.now()
  const strategies = parseLighthouseWeeklyStrategies(process.env.LIGHTHOUSE_WEEKLY_STRATEGIES)
  console.info(`[lighthouse-cron] weekly run started (strategies: ${strategies.join(', ')})`)

  const pb = getAdminPb()
  try {
    await adminAuth(pb)
  } catch (e) {
    console.error('[lighthouse-cron] PocketBase admin auth failed', e)
    return
  }

  const siteIds = await getSiteIdsWithDomains(pb)
  let processed = 0
  let runsOk = 0
  let runsFailed = 0

  for (const siteId of siteIds) {
    try {
      const site = await pb.collection('sites').getOne<{ domain?: string }>(siteId)
      if (isSiteBillingLocked(site as Record<string, unknown>)) continue
      if (!site.domain?.trim()) continue

      for (const strategy of strategies) {
        try {
          const payload = await runLighthouseForSite(pb, siteId, strategy)
          if (payload) {
            runsOk += 1
            console.info(`[lighthouse-cron] site ${siteId} ${strategy}: saved`)
          } else {
            runsFailed += 1
            console.warn(`[lighthouse-cron] site ${siteId} ${strategy}: no result`)
          }
        } catch (e) {
          runsFailed += 1
          console.error(`[lighthouse-cron] site ${siteId} ${strategy} failed`, e)
        }
      }
      processed += 1
    } catch (e) {
      console.error(`[lighthouse-cron] site ${siteId} failed`, e)
    }
  }

  console.info(
    `[lighthouse-cron] weekly run finished in ${Date.now() - started}ms (${processed}/${siteIds.length} sites, ${runsOk} ok, ${runsFailed} failed)`,
  )
}
