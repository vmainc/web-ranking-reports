import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getAdsAccessToken, getDeveloperToken, googleAdsApiUrl } from '~/server/utils/adsAccess'
import { assertSiteAccess } from '~/server/utils/workspace'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = query.siteId as string
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteAccess(pb, siteId, userId, false)

  const devToken = await getDeveloperToken(pb)
  if (!devToken) {
    throw createError({
      statusCode: 503,
      message: 'Google Ads developer token not configured. An admin must set it in Admin → Integrations.',
    })
  }

  const { accessToken, integration } = await getAdsAccessToken(pb, siteId)
  const customerId = integration.config_json?.lsa_customer_id
  if (!customerId) {
    throw createError({
      statusCode: 400,
      message: 'No Local Service Ads account selected. Choose an account first.',
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

  const customerIdClean = String(customerId).replace(/^customers\//, '')
  const url = googleAdsApiUrl(`customers/${customerIdClean}/googleAds:search`)
  const startCompact = start.replace(/-/g, '')
  const endCompact = end.replace(/-/g, '')
  const gaql = `SELECT
    campaign.name,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros,
    metrics.conversions
  FROM campaign
  WHERE campaign.advertising_channel_type = 'LOCAL_SERVICES'
    AND segments.date >= '${startCompact}'
    AND segments.date <= '${endCompact}'
    AND campaign.status != 'REMOVED'`

  const loginCustomerIdRaw = integration.config_json?.lsa_login_customer_id
  const loginCustomerId = loginCustomerIdRaw ? String(loginCustomerIdRaw).replace(/^customers\//, '').trim() : ''
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': devToken,
    'Content-Type': 'application/json',
  }
  if (loginCustomerId && loginCustomerId !== customerIdClean) {
    headers['login-customer-id'] = loginCustomerId
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: gaql }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    results?: Array<{ campaign?: { name?: string }; metrics?: Record<string, string | number | undefined> }>
    error?: { message?: string }
    message?: string
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || 'Google Ads API error'
    throw createError({ statusCode: 502, message: msg })
  }

  const byCampaign = new Map<string, { impressions: number; clicks: number; costMicros: number; leads: number }>()
  for (const r of data.results ?? []) {
    const name = r.campaign?.name || '—'
    const impressions = Number(r.metrics?.impressions ?? 0) || 0
    const clicks = Number(r.metrics?.clicks ?? 0) || 0
    const costMicros = Number(r.metrics?.cost_micros ?? r.metrics?.costMicros ?? 0) || 0
    const leads = Number(r.metrics?.conversions ?? 0) || 0
    const existing = byCampaign.get(name)
    if (existing) {
      existing.impressions += impressions
      existing.clicks += clicks
      existing.costMicros += costMicros
      existing.leads += leads
    } else {
      byCampaign.set(name, { impressions, clicks, costMicros, leads })
    }
  }

  const rows = Array.from(byCampaign.entries()).map(([campaignName, m]) => ({
    campaignName,
    impressions: m.impressions,
    clicks: m.clicks,
    costMicros: m.costMicros,
    cost: m.costMicros / 1_000_000,
    leads: m.leads,
  }))

  const summary = {
    impressions: rows.reduce((s, r) => s + r.impressions, 0),
    clicks: rows.reduce((s, r) => s + r.clicks, 0),
    costMicros: rows.reduce((s, r) => s + r.costMicros, 0),
    cost: rows.reduce((s, r) => s + r.cost, 0),
    leads: rows.reduce((s, r) => s + r.leads, 0),
  }

  return {
    customerId: String(customerId),
    startDate: start,
    endDate: end,
    summary,
    rows,
  }
})

