import type PocketBase from 'pocketbase'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { getDataForSeoCredentials } from '~/server/utils/dataforseo'
import { resolveSiteBacklinksSnapshot } from '~/server/utils/siteBacklinksSnapshot'
import { isSiteBillingLocked } from '~/server/utils/siteBilling'

const JOB_SETTINGS_KEY = 'backlinks_bulk_job'

export type BacklinksBulkJobMeta = {
  bootstrapCompletedAt?: string
  lastWeeklyRunAt?: string
  lastRunLabel?: string
  lastRunProcessed?: number
  lastRunOk?: number
  lastRunFailed?: number
}

export type BacklinksWeeklyRunResult = {
  siteCount: number
  processed: number
  ok: number
  failed: number
  skippedLocked: number
  skippedNoDomain: number
}

async function getSiteIdsWithDomains(pb: PocketBase): Promise<string[]> {
  const sites = await pb.collection('sites').getFullList<{ id: string; domain?: string }>({
    fields: 'id,domain',
    batch: 100,
  })
  return sites.filter((s) => typeof s.domain === 'string' && s.domain.trim()).map((s) => s.id)
}

function siteDelayMs(): number {
  const n = Number(process.env.BACKLINKS_SITE_DELAY_MS ?? 3000)
  return Number.isFinite(n) && n >= 0 ? n : 3000
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getBacklinksBulkJobMeta(pb: PocketBase): Promise<BacklinksBulkJobMeta> {
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value?: BacklinksBulkJobMeta }>(
      `key="${JOB_SETTINGS_KEY}"`,
    )
    return row.value && typeof row.value === 'object' ? row.value : {}
  } catch {
    return {}
  }
}

export async function saveBacklinksBulkJobMeta(pb: PocketBase, patch: BacklinksBulkJobMeta): Promise<void> {
  const prev = await getBacklinksBulkJobMeta(pb)
  const value = { ...prev, ...patch }
  try {
    const list = await pb.collection('app_settings').getFullList<{ id: string }>({
      filter: `key="${JOB_SETTINGS_KEY}"`,
    })
    if (list[0]) {
      await pb.collection('app_settings').update(list[0].id, { value })
    } else {
      await pb.collection('app_settings').create({ key: JOB_SETTINGS_KEY, value })
    }
  } catch (e) {
    console.warn('[backlinks-cron] could not save job metadata to app_settings', e)
  }
}

/**
 * Refresh DataForSEO backlink profiles for every site with a domain (skips billing-locked).
 * Each site runs five Backlinks API live calls; use BACKLINKS_SITE_DELAY_MS to throttle.
 */
export async function runBacklinksWeeklyJob(label: 'weekly' | 'bootstrap' = 'weekly'): Promise<BacklinksWeeklyRunResult> {
  const started = Date.now()
  console.info(`[backlinks-cron] ${label} run started`)

  const pb = getAdminPb()
  try {
    await adminAuth(pb)
  } catch (e) {
    console.error('[backlinks-cron] PocketBase admin auth failed', e)
    return { siteCount: 0, processed: 0, ok: 0, failed: 0, skippedLocked: 0, skippedNoDomain: 0 }
  }

  const creds = await getDataForSeoCredentials(pb)
  if (!creds) {
    console.warn('[backlinks-cron] DataForSEO not configured; skipping run')
    return { siteCount: 0, processed: 0, ok: 0, failed: 0, skippedLocked: 0, skippedNoDomain: 0 }
  }

  const siteIds = await getSiteIdsWithDomains(pb)
  const delay = siteDelayMs()
  let processed = 0
  let ok = 0
  let failed = 0
  let skippedLocked = 0
  let skippedNoDomain = 0

  for (let i = 0; i < siteIds.length; i++) {
    const siteId = siteIds[i]!
    if (i > 0 && delay > 0) await sleep(delay)

    try {
      const site = await pb.collection('sites').getOne<{ domain?: string; backlinks_snapshot?: unknown }>(siteId)
      if (isSiteBillingLocked(site as Record<string, unknown>)) {
        skippedLocked += 1
        continue
      }
      if (!site.domain?.trim()) {
        skippedNoDomain += 1
        continue
      }

      await resolveSiteBacklinksSnapshot(pb, siteId, site, { refresh: true })
      ok += 1
      processed += 1
      console.info(`[backlinks-cron] site ${siteId}: saved`)
    } catch (e) {
      failed += 1
      processed += 1
      console.error(`[backlinks-cron] site ${siteId} failed`, e)
    }
  }

  const result: BacklinksWeeklyRunResult = {
    siteCount: siteIds.length,
    processed,
    ok,
    failed,
    skippedLocked,
    skippedNoDomain,
  }

  const now = new Date().toISOString()
  const metaPatch: BacklinksBulkJobMeta = {
    lastRunLabel: label,
    lastRunProcessed: processed,
    lastRunOk: ok,
    lastRunFailed: failed,
    ...(label === 'weekly' ? { lastWeeklyRunAt: now } : { bootstrapCompletedAt: now }),
  }
  await saveBacklinksBulkJobMeta(pb, metaPatch)

  console.info(
    `[backlinks-cron] ${label} run finished in ${Date.now() - started}ms (${ok} ok, ${failed} failed, ${skippedLocked} billing-locked, ${siteIds.length} sites with domain)`,
  )
  return result
}
