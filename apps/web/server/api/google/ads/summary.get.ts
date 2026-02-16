import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getAdsAccessToken, getDeveloperToken } from '~/server/utils/adsAccess'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = query.siteId as string
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const devToken = await getDeveloperToken(pb)
  if (!devToken) {
    throw createError({
      statusCode: 503,
      message: 'Google Ads developer token not configured. An admin must set it in Admin → Integrations.',
    })
  }

  const { accessToken, integration } = await getAdsAccessToken(pb, siteId)
  const customerId = integration.config_json?.ads_customer_id
  if (!customerId) {
    throw createError({
      statusCode: 400,
      message: 'No Google Ads account selected. Choose an account on the Google Ads page first.',
    })
  }

  const startDate = (query.startDate as string) || ''
  const endDate = (query.endDate as string) || ''
  let start = startDate
  let end = endDate
  if (!start || !end) {
    const endD = new Date()
    const startD = new Date()
    startD.setDate(startD.getDate() - 30)
    start = start || startD.toISOString().slice(0, 10)
    end = end || endD.toISOString().slice(0, 10)
  }

  const datePredicate = start && end
    ? `segments.date BETWEEN '${start}' AND '${end}'`
    : 'segments.date DURING LAST_30_DAYS'
  const gaqlWithRange = `SELECT
    campaign.name,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros
  FROM campaign
  WHERE ${datePredicate}
    AND campaign.status != 'REMOVED'`

  const res = await $fetch<{ results?: Array<{ campaign?: { name?: string }; metrics?: { impressions?: string; clicks?: string; costMicros?: string } }> }>(
    `https://googleads.googleapis.com/v20/customers/${customerId.replace(/^customers\//, '')}/googleAds:search`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': devToken,
        'Content-Type': 'application/json',
      },
      body: { query: gaqlWithRange },
    }
  ).catch((e: unknown) => {
    const msg = e && typeof e === 'object' && 'data' in e && (e as { data?: { message?: string } }).data?.message
      ? (e as { data: { message: string } }).data.message
      : e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 502, message: msg || 'Google Ads API error' })
  })

  const results = res?.results ?? []
  const byCampaign = new Map<string, { impressions: number; clicks: number; costMicros: number }>()
  for (const r of results) {
    const m = r.metrics as Record<string, unknown> | undefined
    const name = (r.campaign?.name ?? '') || '—'
    const impressions = Number(m?.impressions ?? 0) || 0
    const clicks = Number(m?.clicks ?? 0) || 0
    const costMicros = Number(m?.cost_micros ?? m?.costMicros ?? 0) || 0
    const existing = byCampaign.get(name)
    if (existing) {
      existing.impressions += impressions
      existing.clicks += clicks
      existing.costMicros += costMicros
    } else {
      byCampaign.set(name, { impressions, clicks, costMicros })
    }
  }
  const rows = Array.from(byCampaign.entries()).map(([campaignName, m]) => ({
    campaignName,
    impressions: m.impressions,
    clicks: m.clicks,
    costMicros: m.costMicros,
    cost: m.costMicros / 1_000_000,
  }))

  const summary = {
    impressions: rows.reduce((s, r) => s + r.impressions, 0),
    clicks: rows.reduce((s, r) => s + r.clicks, 0),
    costMicros: rows.reduce((s, r) => s + r.costMicros, 0),
    cost: rows.reduce((s, r) => s + r.cost, 0),
  }

  return {
    customerId,
    startDate: start,
    endDate: end,
    summary,
    rows,
  }
})
