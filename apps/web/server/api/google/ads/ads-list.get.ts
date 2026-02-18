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

  const gaql = `SELECT
  campaign.name,
  ad_group.name,
  ad_group_ad.status,
  ad.id,
  ad.name,
  ad.final_urls,
  ad.responsive_search_ad.headlines,
  ad.responsive_search_ad.descriptions,
  ad.expanded_text_ad.headline_part1,
  ad.expanded_text_ad.headline_part2,
  ad.expanded_text_ad.headline_part3,
  ad.expanded_text_ad.description,
  ad.expanded_text_ad.description2
FROM ad_group_ad
WHERE ad_group_ad.status != 'REMOVED'
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
    console.error('Google Ads ads-list error:', res.status, msg)
    throw createError({ statusCode: 502, message: msg })
  }

  const results = raw?.results ?? []
  const rows: Array<{
    campaignName: string
    adGroupName: string
    status: string
    headline: string
    description: string
    finalUrl: string
  }> = []

  for (const r of results) {
    const campaign = (r.campaign ?? {}) as { name?: string }
    const adGroup = (r.ad_group ?? r.adGroup ?? {}) as { name?: string }
    const adGroupAd = (r.ad_group_ad ?? r.adGroupAd ?? {}) as { status?: string }
    const ad = (r.ad ?? {}) as Record<string, unknown>

    const campaignName = campaign?.name ?? '—'
    const adGroupName = adGroup?.name ?? '—'
    const status = adGroupAd?.status ?? '—'

    let headline = ''
    let description = ''
    const rsa = ad?.responsive_search_ad as { headlines?: Array<{ text?: string }>; descriptions?: Array<{ text?: string }> } | undefined
    const eta = ad?.expanded_text_ad as {
      headline_part1?: string
      headline_part2?: string
      headline_part3?: string
      description?: string
      description2?: string
    } | undefined

    if (rsa?.headlines?.length) {
      headline = rsa.headlines.map((h) => (h?.text ?? '').trim()).filter(Boolean).join(' | ') || '—'
    }
    if (rsa?.descriptions?.length) {
      description = rsa.descriptions.map((d) => (d?.text ?? '').trim()).filter(Boolean).join(' ') || ''
    }
    if (!headline && eta) {
      const parts = [eta.headline_part1, eta.headline_part2, eta.headline_part3].filter(Boolean) as string[]
      headline = parts.length ? parts.join(' | ') : '—'
    }
    if (!description && eta) {
      const parts = [eta.description, eta.description2].filter(Boolean) as string[]
      description = parts.length ? parts.join(' ') : ''
    }
    if (!headline) headline = '—'
    if (!description) description = '—'

    const finalUrls = ad?.final_urls as string[] | undefined
    const finalUrl = Array.isArray(finalUrls) && finalUrls.length ? finalUrls[0] : ''

    rows.push({
      campaignName,
      adGroupName,
      status,
      headline,
      description,
      finalUrl,
    })
  }

  return { rows }
})
