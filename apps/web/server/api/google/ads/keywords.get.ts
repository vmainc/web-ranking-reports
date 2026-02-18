import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getAdsAccessToken, getDeveloperToken } from '~/server/utils/adsAccess'

/**
 * Keyword performance for the selected Google Ads account and date range.
 * Uses keyword_view; no segments.date in SELECT to avoid invalid argument.
 */
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

  const startCompact = start.replace(/-/g, '')
  const endCompact = end.replace(/-/g, '')
  const datePredicate = start && end
    ? `segments.date >= '${startCompact}' AND segments.date <= '${endCompact}'`
    : 'segments.date DURING LAST_30_DAYS'

  const gaql = `SELECT
  ad_group_criterion.keyword.text,
  ad_group_criterion.keyword.match_type,
  campaign.name,
  ad_group.name,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros
FROM keyword_view
WHERE ${datePredicate}
  AND ad_group_criterion.status != 'REMOVED'`

  const loginCustomerIdRaw = integration.config_json?.ads_login_customer_id
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
  let raw: { results?: Array<Record<string, unknown>>; error?: { message?: string }; message?: string }
  try {
    raw = (await res.json()) as typeof raw
  } catch {
    raw = { message: 'Invalid JSON response from Google Ads API' }
  }

  if (!res.ok) {
    const msg = raw?.error?.message || raw?.message || `Google Ads API ${res.status}`
    console.error('Google Ads keywords error:', res.status, msg)
    throw createError({ statusCode: 502, message: msg })
  }

  const results = raw?.results ?? []
  const rows: Array<{
    keyword: string
    matchType: string
    campaignName: string
    adGroupName: string
    impressions: number
    clicks: number
    costMicros: number
    cost: number
  }> = []

  for (const r of results) {
    const criterion = (r.ad_group_criterion ?? r.adGroupCriterion) as { keyword?: { text?: string; matchType?: string; match_type?: string } } | undefined
    const keyword = criterion?.keyword?.text ?? (criterion?.keyword as { text?: string })?.text ?? ''
    const matchTypeRaw = criterion?.keyword?.matchType ?? (criterion?.keyword as { match_type?: string })?.match_type ?? ''
    const campaign = (r.campaign ?? {}) as { name?: string }
    const adGroup = (r.ad_group ?? r.adGroup ?? {}) as { name?: string }
    const m = (r.metrics ?? {}) as Record<string, unknown>
    const impressions = Number(m?.impressions ?? 0) || 0
    const clicks = Number(m?.clicks ?? 0) || 0
    const costMicros = Number(m?.cost_micros ?? m?.costMicros ?? 0) || 0
    rows.push({
      keyword: String(keyword).trim() || '—',
      matchType: String(matchTypeRaw).trim() || '—',
      campaignName: campaign?.name ?? (r.campaign as { name?: string })?.name ?? '—',
      adGroupName: adGroup?.name ?? (r.ad_group as { name?: string })?.name ?? '—',
      impressions,
      clicks,
      costMicros,
      cost: costMicros / 1_000_000,
    })
  }

  // Sort by clicks desc then cost desc
  rows.sort((a, b) => b.clicks - a.clicks || b.cost - a.cost)

  return {
    startDate: start,
    endDate: end,
    rows,
  }
})
