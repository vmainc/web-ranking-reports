import type PocketBase from 'pocketbase'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { getDataForSeoCredentials } from '~/server/utils/dataforseo'
import { resolveSiteAiVisibilitySnapshot } from '~/server/utils/siteAiVisibilitySnapshot'
import { isSiteBillingLocked } from '~/server/utils/siteBilling'
import { MAX_KEYWORDS_PER_FETCH } from '~/server/utils/dataforseoAiVisibility'

const JOB_SETTINGS_KEY = 'ai_visibility_bulk_job'

export type AiVisibilityBulkJobMeta = {
  lastWeeklyRunAt?: string
  lastRunLabel?: string
  lastRunProcessed?: number
  lastRunOk?: number
  lastRunFailed?: number
}

export type AiVisibilityWeeklyRunResult = {
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
  // Domain + up to 5 keyword live calls per site; default slower than backlinks.
  const n = Number(process.env.AI_VISIBILITY_SITE_DELAY_MS ?? 5000)
  return Number.isFinite(n) && n >= 0 ? n : 5000
}

function maxKeywords(): number {
  const n = Number(process.env.AI_VISIBILITY_MAX_KEYWORDS ?? MAX_KEYWORDS_PER_FETCH)
  if (!Number.isFinite(n)) return MAX_KEYWORDS_PER_FETCH
  return Math.min(MAX_KEYWORDS_PER_FETCH, Math.max(0, Math.round(n)))
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getAiVisibilityBulkJobMeta(pb: PocketBase): Promise<AiVisibilityBulkJobMeta> {
  try {
    const row = await pb.collection('app_settings').getFirstListItem<{ value?: AiVisibilityBulkJobMeta }>(
      `key="${JOB_SETTINGS_KEY}"`,
    )
    return row.value && typeof row.value === 'object' ? row.value : {}
  } catch {
    return {}
  }
}

export async function saveAiVisibilityBulkJobMeta(pb: PocketBase, patch: AiVisibilityBulkJobMeta): Promise<void> {
  const prev = await getAiVisibilityBulkJobMeta(pb)
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
    console.warn('[ai-visibility-cron] could not save job metadata to app_settings', e)
  }
}

/**
 * Refresh DataForSEO LLM Mentions snapshots for every site with a domain (skips billing-locked).
 * Each site: 1 domain call + up to N keyword calls. Throttle with AI_VISIBILITY_SITE_DELAY_MS.
 */
export async function runAiVisibilityWeeklyJob(label: 'weekly' = 'weekly'): Promise<AiVisibilityWeeklyRunResult> {
  const started = Date.now()
  console.info(`[ai-visibility-cron] ${label} run started`)

  const pb = getAdminPb()
  try {
    await adminAuth(pb)
  } catch (e) {
    console.error('[ai-visibility-cron] PocketBase admin auth failed', e)
    return { siteCount: 0, processed: 0, ok: 0, failed: 0, skippedLocked: 0, skippedNoDomain: 0 }
  }

  const creds = await getDataForSeoCredentials(pb)
  if (!creds) {
    console.warn('[ai-visibility-cron] DataForSEO not configured; skipping run')
    return { siteCount: 0, processed: 0, ok: 0, failed: 0, skippedLocked: 0, skippedNoDomain: 0 }
  }

  const siteIds = await getSiteIdsWithDomains(pb)
  const delay = siteDelayMs()
  const kwLimit = maxKeywords()
  let processed = 0
  let ok = 0
  let failed = 0
  let skippedLocked = 0
  let skippedNoDomain = 0

  for (let i = 0; i < siteIds.length; i++) {
    const siteId = siteIds[i]!
    if (i > 0 && delay > 0) await sleep(delay)

    try {
      const site = await pb.collection('sites').getOne<{ domain?: string; ai_visibility_snapshot?: unknown }>(siteId)
      if (isSiteBillingLocked(site as Record<string, unknown>)) {
        skippedLocked += 1
        continue
      }
      if (!site.domain?.trim()) {
        skippedNoDomain += 1
        continue
      }

      await resolveSiteAiVisibilitySnapshot(pb, siteId, site, {
        refresh: true,
        maxKeywords: kwLimit,
      })
      ok += 1
      processed += 1
      console.info(`[ai-visibility-cron] site ${siteId}: saved`)
    } catch (e) {
      failed += 1
      processed += 1
      console.error(`[ai-visibility-cron] site ${siteId} failed`, e)
    }
  }

  const result: AiVisibilityWeeklyRunResult = {
    siteCount: siteIds.length,
    processed,
    ok,
    failed,
    skippedLocked,
    skippedNoDomain,
  }

  const now = new Date().toISOString()
  await saveAiVisibilityBulkJobMeta(pb, {
    lastRunLabel: label,
    lastRunProcessed: processed,
    lastRunOk: ok,
    lastRunFailed: failed,
    lastWeeklyRunAt: now,
  })

  console.info(
    `[ai-visibility-cron] ${label} run finished in ${Date.now() - started}ms (${ok} ok, ${failed} failed, ${skippedLocked} billing-locked, ${siteIds.length} sites with domain)`,
  )
  return result
}
