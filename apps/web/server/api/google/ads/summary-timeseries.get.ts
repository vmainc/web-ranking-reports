import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getAdsAccessToken, getDeveloperToken } from '~/server/utils/adsAccess'

/**
 * Daily time series of cost, clicks, and conversions for the selected Google Ads account.
 * Used for the trend line chart. Includes segments.date in SELECT.
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
  segments.date,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions
FROM campaign
WHERE ${datePredicate}
  AND campaign.status != 'REMOVED'`

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

  async function runQuery(q: string): Promise<{ res: Response; raw: { results?: Array<Record<string, unknown>>; error?: { message?: string }; message?: string } }> {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ query: q }) })
    let raw: { results?: Array<Record<string, unknown>>; error?: { message?: string }; message?: string }
    try {
      raw = (await res.json()) as typeof raw
    } catch {
      raw = { message: 'Invalid JSON response from Google Ads API' }
    }
    return { res, raw }
  }

  const { res, raw } = await runQuery(gaql)

  function parseDateStr(dateStr: string): string {
    if (!dateStr || typeof dateStr !== 'string') return ''
    const s = dateStr.replace(/-/g, '').trim()
    if (s.length >= 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr
    return ''
  }

  const results = raw?.results ?? []
  const byDate = new Map<string, { clicks: number; costMicros: number; conversions: number }>()

  if (res.ok && results.length > 0) {
    for (const r of results) {
      const seg = (r.segments ?? (r as Record<string, unknown>).segments) as { date?: string } | undefined
      const dateStr = seg?.date ?? (r as Record<string, unknown>).segmentsDate ?? ''
      const formatted = parseDateStr(String(dateStr))
      if (!formatted) continue
      const m = (r.metrics ?? {}) as Record<string, unknown>
      const clicks = Number(m?.clicks ?? 0) || 0
      const costMicros = Number(m?.cost_micros ?? m?.costMicros ?? 0) || 0
      const conversions = Number(m?.conversions ?? 0) || 0
      const existing = byDate.get(formatted)
      if (existing) {
        existing.clicks += clicks
        existing.costMicros += costMicros
        existing.conversions += conversions
      } else {
        byDate.set(formatted, { clicks, costMicros, conversions })
      }
    }
  }

  const msg = raw?.error?.message || raw?.message || ''
  const invalidArg = msg.toLowerCase().includes('invalid argument')
  const needFallback = (byDate.size === 0 && res.ok) || (!res.ok && invalidArg)
  if (needFallback) {
    const fallbackGaql = `SELECT
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions
FROM campaign
WHERE ${datePredicate}
  AND campaign.status != 'REMOVED'`
    const fallback = await runQuery(fallbackGaql)
    if (fallback.res.ok && (fallback.raw?.results ?? []).length > 0) {
      let totalClicks = 0
      let totalCostMicros = 0
      let totalConversions = 0
      for (const r of fallback.raw.results ?? []) {
        const m = (r.metrics ?? {}) as Record<string, unknown>
        totalClicks += Number(m?.clicks ?? 0) || 0
        totalCostMicros += Number(m?.cost_micros ?? m?.costMicros ?? 0) || 0
        totalConversions += Number(m?.conversions ?? 0) || 0
      }
      const midDate = start && end ? (() => {
        const a = new Date(start).getTime()
        const b = new Date(end).getTime()
        const mid = new Date((a + b) / 2)
        return mid.toISOString().slice(0, 10)
      })() : start || end
      const rows = midDate ? [{
        date: midDate,
        clicks: totalClicks,
        costMicros: totalCostMicros,
        cost: totalCostMicros / 1_000_000,
        conversions: totalConversions,
      }] : []
      return { startDate: start, endDate: end, rows }
    }
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
    console.error('Google Ads summary-timeseries error:', res.status, msg)
    throw createError({ statusCode: 502, message: msg })
  }

  const sortedDates = Array.from(byDate.keys()).sort()
  const rows = sortedDates.map((date) => {
    const d = byDate.get(date)!
    return {
      date,
      clicks: d.clicks,
      costMicros: d.costMicros,
      cost: d.costMicros / 1_000_000,
      conversions: d.conversions,
    }
  })

  return {
    startDate: start,
    endDate: end,
    rows,
  }
})
