import type PocketBase from 'pocketbase'
import {
  buildWeeklySnapshotSections,
  LAYOUT_TEMPLATE_WEEKLY_SNAPSHOT,
} from '~/utils/reportLayoutPresets'
import { checkLimit, getUsageLimits, getUserPlan, incrementUsage } from '~/server/services/subscriptions'

/**
 * Scheduled job: rank snapshot + default “Weekly Snapshot” layout (site-overview style sections)
 * for future PDF/email. `sections` matches full-report payload shape.
 */
export async function generateAutomatedReport(pb: PocketBase, siteId: string): Promise<{ reportId: string }> {
  const site = await pb.collection('sites').getOne<{ user?: string }>(siteId)
  const ownerUserId = String(site.user || '').trim()
  if (!ownerUserId) throw createError({ statusCode: 400, message: 'Site owner is missing.' })

  const limit = await checkLimit(pb, ownerUserId, 'reports', 1)
  if (!limit.allowed) {
    throw createError({ statusCode: 402, message: limit.message || 'Monthly report limit reached.' })
  }

  const rows = await pb.collection('rank_keywords').getFullList<{ keyword?: string; last_position?: number }>({
    filter: `site = "${siteId.replace(/"/g, '\\"')}"`,
    batch: 500,
  })

  const now = new Date().toISOString()
  const day = now.slice(0, 10)

  const cfg = useRuntimeConfig()
  const woo = (cfg.public?.woocommerceEnabled as boolean | undefined) !== false
  const weeklySections = buildWeeklySnapshotSections(woo)

  const payload = {
    automated: true,
    snapshot_at: now,
    name: 'Weekly Snapshot',
    layoutTemplateKey: LAYOUT_TEMPLATE_WEEKLY_SNAPSHOT,
    rangePreset: 'last_7_days',
    comparePreset: 'previous_period',
    sections: weeklySections,
    keyword_count: rows.length,
    keywords: rows.slice(0, 100).map((r) => ({
      keyword: typeof r.keyword === 'string' ? r.keyword : '',
      position: typeof r.last_position === 'number' ? r.last_position : null,
    })),
  }

  try {
    const plan = await getUserPlan(pb, ownerUserId)
    const limits = await getUsageLimits(pb, plan)
    if (limits.branding_required) {
      ;(payload as Record<string, unknown>).branding_required = true
      ;(payload as Record<string, unknown>).branding_badge = 'Powered by Web Ranking Reports'
    }
  } catch {
    // ignore
  }

  const report = await pb.collection('reports').create({
    site: siteId,
    type: 'automated',
    period_start: day,
    period_end: day,
    payload_json: payload,
  })
  await incrementUsage(pb, ownerUserId, 'reports', 1)

  return { reportId: report.id }
}
