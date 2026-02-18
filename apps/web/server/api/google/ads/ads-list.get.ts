import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getAdsAccessToken, getDeveloperToken } from '~/server/utils/adsAccess'

/**
 * List of ads (ad copy) for the selected Google Ads account.
 * Uses ad_group_ad; only from enabled campaigns.
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

  const customerIdClean = customerId.replace(/^customers\//, '')
  const url = `https://googleads.googleapis.com/v23/customers/${customerIdClean}/googleAds:search`

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

  const baseWhere = `ad_group_ad.status != 'REMOVED' AND campaign.status = 'ENABLED'`
  const minimalGaql = `SELECT campaign.name, ad_group.name, ad_group_ad.status, ad.id, ad.final_urls FROM ad_group_ad WHERE ${baseWhere}`

  const { res, raw } = await runQuery(minimalGaql)
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
    console.error('Google Ads ads-list error:', res.status, msg)
    throw createError({ statusCode: 502, message: msg })
  }

  const results = raw?.results ?? []
  const rows: Array<{ campaignName: string; adGroupName: string; status: string; headline: string; description: string; finalUrl: string }> = []
  const byAdId = new Map<string, number>()

  for (const r of results) {
    const campaign = (r.campaign ?? {}) as { name?: string }
    const adGroup = (r.ad_group ?? (r as Record<string, unknown>).adGroup ?? {}) as { name?: string }
    const adGroupAd = (r.ad_group_ad ?? (r as Record<string, unknown>).adGroupAd ?? {}) as { status?: string }
    const ad = (r.ad ?? {}) as Record<string, unknown>
    const adId = String((ad as { id?: string }).id ?? '')
    const campaignName = campaign?.name ?? '—'
    const adGroupName = adGroup?.name ?? '—'
    const status = adGroupAd?.status ?? '—'
    const finalUrls = ad?.final_urls as string[] | undefined
    const finalUrl = Array.isArray(finalUrls) && finalUrls.length ? finalUrls[0] : ''
    rows.push({
      campaignName,
      adGroupName,
      status,
      headline: '—',
      description: '—',
      finalUrl,
    })
    if (adId) byAdId.set(adId, rows.length - 1)
  }

  const enrichQueries: Array<{ gaql: string; parse: (r: Record<string, unknown>) => { id?: string; headline: string; description: string } }> = [
    {
      gaql: `SELECT ad.id, ad.responsive_search_ad.headlines, ad.responsive_search_ad.descriptions FROM ad_group_ad WHERE ${baseWhere} AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'`,
      parse(r) {
        const ad = (r.ad ?? {}) as Record<string, unknown>
        const id = (ad as { id?: string }).id != null ? String((ad as { id: string }).id) : undefined
        const rsa = ad?.responsive_search_ad as { headlines?: Array<{ text?: string }>; descriptions?: Array<{ text?: string }> } | undefined
        const headline = rsa?.headlines?.length ? rsa.headlines.map((h) => (h?.text ?? '').trim()).filter(Boolean).join(' | ') : ''
        const description = rsa?.descriptions?.length ? rsa.descriptions.map((d) => (d?.text ?? '').trim()).filter(Boolean).join(' ') : ''
        return { id, headline, description }
      },
    },
    {
      gaql: `SELECT ad.id, ad.expanded_text_ad.headline_part1, ad.expanded_text_ad.headline_part2, ad.expanded_text_ad.headline_part3, ad.expanded_text_ad.description, ad.expanded_text_ad.description2 FROM ad_group_ad WHERE ${baseWhere} AND ad_group_ad.ad.type = 'EXPANDED_TEXT_AD'`,
      parse(r) {
        const ad = (r.ad ?? {}) as Record<string, unknown>
        const id = (ad as { id?: string }).id != null ? String((ad as { id: string }).id) : undefined
        const eta = ad?.expanded_text_ad as { headline_part1?: string; headline_part2?: string; headline_part3?: string; description?: string; description2?: string } | undefined
        const headline = eta ? [eta.headline_part1, eta.headline_part2, eta.headline_part3].filter(Boolean).join(' | ') : ''
        const description = eta ? [eta.description, eta.description2].filter(Boolean).join(' ') : ''
        return { id, headline, description }
      },
    },
  ]

  for (const { gaql: q, parse } of enrichQueries) {
    try {
      const enrich = await runQuery(q)
      if (!enrich.res.ok) continue
      for (const r of enrich.raw?.results ?? []) {
        const { id, headline, description } = parse(r)
        if (id && (headline || description)) {
          const idx = byAdId.get(id)
          if (idx !== undefined) {
            if (headline) rows[idx].headline = headline
            if (description) rows[idx].description = description
          }
        }
      }
    } catch {
      // ignore enrichment failures; we already have minimal rows
    }
  }

  return { rows }
})
