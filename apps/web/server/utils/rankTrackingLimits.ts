import type PocketBase from 'pocketbase'
import type { SubscriptionPlan } from '~/server/services/subscriptions'
import { getSubscriptionStatus } from '~/server/services/subscriptions'

/** PocketBase / product cap per site before plan limits. */
export const RANK_TRACKING_PER_SITE_HARD_CAP = 100

export type RankTrackingKeywordLimitContext = {
  maxKeywords: number
  plan: SubscriptionPlan
}

/**
 * Max keywords allowed on one site: min(per-site hard cap, plan remaining quota
 * allocated to this site). Plan keyword counts are workspace-wide.
 */
export async function getRankTrackingKeywordLimitContext(
  pb: PocketBase,
  userId: string,
  keywordsOnThisSite: number,
): Promise<RankTrackingKeywordLimitContext> {
  const st = await getSubscriptionStatus(pb, userId)
  const planMax = Math.max(0, Math.floor(Number(st.limits.max_keywords ?? 0)))
  const usageKw = Math.max(0, Math.floor(Number(st.usage.keywords ?? 0)))
  const onOtherSites = Math.max(0, usageKw - keywordsOnThisSite)
  const room = planMax - onOtherSites
  const maxKeywords = Math.min(RANK_TRACKING_PER_SITE_HARD_CAP, Math.max(keywordsOnThisSite, room))
  return { maxKeywords, plan: st.plan }
}
