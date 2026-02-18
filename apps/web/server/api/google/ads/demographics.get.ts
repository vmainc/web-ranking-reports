import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getAdsAccessToken, getDeveloperToken } from '~/server/utils/adsAccess'

/**
 * Gender demographics for the selected Google Ads account and date range.
 * Uses gender_view with ad_group_criterion.gender.type; date in WHERE only.
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
  ad_group_criterion.gender.type,
  metrics.clicks,
  metrics.impressions
FROM gender_view
WHERE ${datePredicate}
  AND campaign.status = 'ENABLED'`

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
    const noLogin = !loginCustomerId || loginCustomerId === customerIdClean
    const isManager =
      (msg.toLowerCase().includes('manager') && msg.toLowerCase().includes('metric')) ||
      (noLogin && msg.toLowerCase().includes('invalid argument'))
    if (isManager) {
      throw createError({
        statusCode: 400,
        message: "Manager accounts don't have campaign data. Please select a linked (child) account using Change account.",
      })
    }
    console.error('Google Ads demographics error:', res.status, msg)
    throw createError({ statusCode: 502, message: msg })
  }

  const results = raw?.results ?? []
  const byGender = new Map<string, { clicks: number; impressions: number }>()
  const genderLabel = (type: string): string => {
    const t = String(type || '').toUpperCase()
    if (t === 'MALE') return 'Male'
    if (t === 'FEMALE') return 'Female'
    if (t === 'UNDETERMINED') return 'Unknown'
    if (t === 'UNKNOWN' || t === 'UNSPECIFIED') return 'Unknown'
    return t || 'Unknown'
  }

  for (const r of results) {
    const criterion = (r.ad_group_criterion ?? (r as Record<string, unknown>).adGroupCriterion) as { gender?: { type?: string }; genderType?: string } | undefined
    const type = criterion?.gender?.type ?? (criterion?.gender as { type?: string })?.type ?? criterion?.genderType ?? ''
    const label = genderLabel(type)
    const m = (r.metrics ?? {}) as Record<string, unknown>
    const clicks = Number(m?.clicks ?? 0) || 0
    const impressions = Number(m?.impressions ?? 0) || 0
    const existing = byGender.get(label)
    if (existing) {
      existing.clicks += clicks
      existing.impressions += impressions
    } else {
      byGender.set(label, { clicks, impressions })
    }
  }

  const rows = Array.from(byGender.entries()).map(([gender, m]) => ({
    gender,
    clicks: m.clicks,
    impressions: m.impressions,
  }))
  rows.sort((a, b) => b.clicks - a.clicks)

  return {
    startDate: start,
    endDate: end,
    rows,
  }
})
