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

  const customerIdClean = customerId.replace(/^customers\//, '')
  const url = `https://googleads.googleapis.com/v23/customers/${customerIdClean}/googleAds:search`
  // Do not SELECT segments.date — filter only in WHERE. Avoids "invalid argument" with some date ranges.
  const selectFrom = `SELECT
    campaign.name,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros
  FROM campaign
  WHERE `
  const tailGaql = ` AND campaign.status != 'REMOVED'`

  const gaqlFallback = selectFrom + "segments.date DURING LAST_30_DAYS" + tailGaql
  // Custom range: YYYYMMDD in WHERE only
  const startCompact = start.replace(/-/g, '')
  const endCompact = end.replace(/-/g, '')
  const datePredicateCustom = start && end
    ? `segments.date >= '${startCompact}' AND segments.date <= '${endCompact}'`
    : 'segments.date DURING LAST_30_DAYS'
  const gaqlCustom = selectFrom + datePredicateCustom + tailGaql

  type ApiRow = { campaign?: { name?: string }; metrics?: { impressions?: string; clicks?: string; costMicros?: string } }
  type ApiData = { results?: ApiRow[]; error?: { message?: string }; message?: string }
  let data: ApiData
  let usedFallbackDateRange = false
  let actualStart = start
  let actualEnd = end

  const loginCustomerId = integration.config_json?.ads_login_customer_id
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': devToken,
    'Content-Type': 'application/json',
  }
  if (loginCustomerId && String(loginCustomerId).trim()) {
    headers['login-customer-id'] = String(loginCustomerId).replace(/^customers\//, '').trim()
  }

  async function runQuery(gaql: string): Promise<{ res: Response; raw: ApiData }> {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: gaql }),
    })
    let raw: ApiData
    try {
      raw = (await res.json()) as ApiData
    } catch {
      raw = { message: 'Invalid JSON response from Google Ads API' }
    }
    return { res, raw }
  }

  async function tryFallback(): Promise<void> {
    usedFallbackDateRange = true
    const endD = new Date()
    const startD = new Date()
    startD.setDate(startD.getDate() - 30)
    actualStart = startD.toISOString().slice(0, 10)
    actualEnd = endD.toISOString().slice(0, 10)
    const fallback = await runQuery(gaqlFallback)
    if (!fallback.res.ok) {
      console.error('Google Ads summary error (fallback):', fallback.res.status, JSON.stringify(fallback.raw))
      throw createError({ statusCode: 502, message: fallback.raw?.error?.message || fallback.raw?.message || 'Google Ads API error' })
    }
    data = fallback.raw
  }

  try {
    let res: Response | undefined
    let raw: ApiData | undefined
    try {
      const first = await runQuery(gaqlCustom)
      res = first.res
      raw = first.raw
    } catch (e: unknown) {
      console.error('Google Ads summary error (fetch/parse):', e)
      if (start && end) {
        await tryFallback()
        // data set by tryFallback
      } else {
        throw createError({ statusCode: 502, message: e instanceof Error ? e.message : 'Google Ads API request failed' })
      }
    }
    if (res && !res.ok) {
      const msg = raw?.error?.message || raw?.message || ''
      console.error('Google Ads summary error:', res.status, msg, JSON.stringify(raw))
      if (start && end) {
        await tryFallback()
      } else {
        throw createError({ statusCode: 502, message: msg || `Google Ads API ${res.status}` })
      }
    } else if (res?.ok && raw) {
      data = raw
    }
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'statusCode' in e && (e as { statusCode: number }).statusCode === 502) throw e
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Google Ads summary error:', msg)
    throw createError({ statusCode: 502, message: msg })
  }

  const results = data?.results ?? []
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
    startDate: actualStart,
    endDate: actualEnd,
    usedFallbackDateRange: usedFallbackDateRange || undefined,
    summary,
    rows,
  }
})
