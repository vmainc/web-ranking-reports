import type PocketBase from 'pocketbase'
import {
  decryptIntegrationToken,
  getAgencyIntegration,
  markMetaReconnectRequired,
} from '~/server/services/social/agencyMetaIntegration'
import { findMetaAdAccountConnection } from '~/server/services/social/socialConnections'
import { SocialErrorCode, SocialServiceError } from '~/server/services/social/errors'
import {
  fetchMetaAdAccountInsights,
  sumMetaAdsConversions,
  type MetaAdsInsightRow,
} from '~/server/utils/metaClient'
import { extractPocketBaseRelationId } from '~/server/utils/workspace'

export type MetaAdsCampaignRow = {
  campaignId: string
  campaignName: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
}

export type MetaAdsSummaryResult = {
  accountId: string
  accountName: string
  currency: string
  startDate: string
  endDate: string
  summary: {
    spend: number
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cpc: number
  }
  rows: MetaAdsCampaignRow[]
}

export type MetaAdsTimeseriesRow = {
  date: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
}

function defaultRange(): { start: string; end: string } {
  const endD = new Date()
  const startD = new Date()
  startD.setDate(startD.getDate() - 30)
  return {
    start: startD.toISOString().slice(0, 10),
    end: endD.toISOString().slice(0, 10),
  }
}

function parseInsightMetrics(row: MetaAdsInsightRow) {
  const spend = Number(row.spend || 0) || 0
  const impressions = Number(row.impressions || 0) || 0
  const clicks = Number(row.clicks || 0) || 0
  const conversions = sumMetaAdsConversions(row.actions)
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : Number(row.ctr || 0) || 0
  return { spend, impressions, clicks, conversions, ctr }
}

async function resolveAdAccess(
  pb: PocketBase,
  siteId: string,
  _userId: string,
): Promise<{ accessToken: string; accountId: string; accountName: string }> {
  const site = await pb.collection('sites').getOne(siteId)
  const ownerId = extractPocketBaseRelationId((site as { user?: unknown }).user)
  const conn = await findMetaAdAccountConnection(pb, siteId)
  if (!conn || conn.status !== 'active') {
    throw new SocialServiceError({
      code: SocialErrorCode.SOCIAL_CONNECTION_NOT_FOUND,
      message: 'No Meta ad account mapped',
      publicMessage: 'Map a Meta ad account to this site from Agency → Integrations → Meta.',
      httpStatus: 404,
    })
  }
  const integ = await getAgencyIntegration(pb, ownerId, 'meta')
  if (!integ || integ.status === 'disconnected') {
    throw new SocialServiceError({
      code: SocialErrorCode.META_AUTH_EXPIRED,
      message: 'Meta is not connected',
      publicMessage: 'Reconnect Meta from Agency → Integrations.',
      httpStatus: 401,
    })
  }
  try {
    const accessToken = decryptIntegrationToken(integ)
    return {
      accessToken,
      accountId: conn.external_asset_id,
      accountName: conn.display_name || conn.external_asset_id,
    }
  } catch (e) {
    if (e instanceof SocialServiceError && e.code === SocialErrorCode.META_AUTH_EXPIRED) {
      await markMetaReconnectRequired(pb, integ, e.message)
    }
    throw e
  }
}

export async function getMetaAdsSummaryForSite(
  pb: PocketBase,
  opts: { siteId: string; userId: string; startDate?: string; endDate?: string },
): Promise<MetaAdsSummaryResult> {
  const { accessToken, accountId, accountName } = await resolveAdAccess(pb, opts.siteId, opts.userId)
  const fallback = defaultRange()
  const start = opts.startDate || fallback.start
  const end = opts.endDate || fallback.end

  let campaignRows: MetaAdsInsightRow[]
  try {
    campaignRows = await fetchMetaAdAccountInsights({
      accessToken,
      accountId,
      since: start,
      until: end,
      level: 'campaign',
    })
  } catch (e) {
    if (e instanceof SocialServiceError && e.code === SocialErrorCode.META_AUTH_EXPIRED) {
      const site = await pb.collection('sites').getOne(opts.siteId)
      const ownerId = extractPocketBaseRelationId((site as { user?: unknown }).user)
      const integ = await getAgencyIntegration(pb, ownerId, 'meta')
      if (integ) await markMetaReconnectRequired(pb, integ, e.message)
    }
    throw e
  }

  const byCampaign = new Map<string, MetaAdsCampaignRow>()
  for (const raw of campaignRows) {
    const m = parseInsightMetrics(raw)
    const key = raw.campaign_id || raw.campaign_name || '—'
    const existing = byCampaign.get(key)
    if (existing) {
      existing.spend += m.spend
      existing.impressions += m.impressions
      existing.clicks += m.clicks
      existing.conversions += m.conversions
      existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0
    } else {
      byCampaign.set(key, {
        campaignId: raw.campaign_id || '',
        campaignName: raw.campaign_name || '—',
        spend: m.spend,
        impressions: m.impressions,
        clicks: m.clicks,
        conversions: m.conversions,
        ctr: m.ctr,
      })
    }
  }

  const rows = [...byCampaign.values()].sort((a, b) => b.spend - a.spend)
  const spend = rows.reduce((s, r) => s + r.spend, 0)
  const impressions = rows.reduce((s, r) => s + r.impressions, 0)
  const clicks = rows.reduce((s, r) => s + r.clicks, 0)
  const conversions = rows.reduce((s, r) => s + r.conversions, 0)

  return {
    accountId,
    accountName,
    currency: 'USD',
    startDate: start,
    endDate: end,
    summary: {
      spend,
      impressions,
      clicks,
      conversions,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
    },
    rows,
  }
}

export async function getMetaAdsTimeseriesForSite(
  pb: PocketBase,
  opts: { siteId: string; userId: string; startDate?: string; endDate?: string },
): Promise<{ accountId: string; startDate: string; endDate: string; rows: MetaAdsTimeseriesRow[] }> {
  const { accessToken, accountId } = await resolveAdAccess(pb, opts.siteId, opts.userId)
  const fallback = defaultRange()
  const start = opts.startDate || fallback.start
  const end = opts.endDate || fallback.end

  const daily = await fetchMetaAdAccountInsights({
    accessToken,
    accountId,
    since: start,
    until: end,
    timeIncrement: 1,
  })

  const byDate = new Map<string, MetaAdsTimeseriesRow>()
  for (const raw of daily) {
    const date = (raw.date_start || '').slice(0, 10)
    if (!date) continue
    const m = parseInsightMetrics(raw)
    const existing = byDate.get(date)
    if (existing) {
      existing.spend += m.spend
      existing.impressions += m.impressions
      existing.clicks += m.clicks
      existing.conversions += m.conversions
    } else {
      byDate.set(date, {
        date,
        spend: m.spend,
        impressions: m.impressions,
        clicks: m.clicks,
        conversions: m.conversions,
      })
    }
  }

  const rows = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
  return { accountId, startDate: start, endDate: end, rows }
}
