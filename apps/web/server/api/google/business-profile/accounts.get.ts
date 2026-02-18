import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getGAAccessToken } from '~/server/utils/gaAccess'

const GBP_ACCOUNTS_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const gbpAccountsCache = new Map<string, { data: { accounts: Array<{ name: string; id: string; accountName: string; type: string }> }; expiresAt: number }>()

/** List Google Business Profile accounts (same Google token). Cached 5 min to reduce rate limits. */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = query.siteId as string
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const cacheKey = `gbp_accounts:${siteId}`
  const cached = gbpAccountsCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) return cached.data

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const { accessToken, integration } = await getGAAccessToken(pb, siteId)
  const storedScope = (integration.config_json?.google as { scope?: string } | undefined)?.scope ?? ''

  const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    if (res.status === 429) {
      throw createError({
        statusCode: 429,
        message: 'Google Business Profile API rate limit reached. Please wait a minute and try again—no need to reconnect.',
      })
    }
    if (res.status === 403) {
      const hasBusinessScope = storedScope.includes('business.manage')
      try {
        const err = JSON.parse(text) as { error?: { message?: string } }
        const msg = err?.error?.message ?? ''
        if (/Access Not Configured|not enabled/i.test(msg) || hasBusinessScope) {
          throw createError({
            statusCode: 403,
            message: 'Google Business Profile access not granted. The Google Cloud project used for OAuth must have "My Business Account Management API" enabled. An admin should open the project in Google Cloud Console, go to APIs & Services → Library, search "My Business Account Management", and enable it. No reconnect needed after enabling.',
            data: { code: 'API_NOT_ENABLED', enableUrl: 'https://console.cloud.google.com/apis/library/mybusinessaccountmanagement.googleapis.com' },
          })
        }
      } catch (e) {
        if (e && typeof e === 'object' && 'statusCode' in e && (e as { statusCode: number }).statusCode === 403) throw e
      }
      throw createError({
        statusCode: 403,
        message: 'Google Business Profile access not granted. Do both steps in order: (1) An admin must enable "My Business Account Management API" in the Google Cloud project (APIs & Services → Library). (2) Then disconnect Google on Integrations and click "Reconnect Google (show consent screen)" below and approve all permissions. Reconnecting without enabling the API first will not fix this.',
        data: { code: 'MISSING_SCOPE', enableUrl: 'https://console.cloud.google.com/apis/library/mybusinessaccountmanagement.googleapis.com' },
      })
    }
    throw createError({ statusCode: res.status, message: `Business Profile API: ${res.status} ${text.slice(0, 200)}` })
  }

  const data = (await res.json()) as { accounts?: Array<{ name: string; accountName?: string; type?: string }> }
  const accounts = (data.accounts ?? []).map((a) => ({
    name: a.name,
    id: a.name.replace(/^accounts\//, ''),
    accountName: a.accountName ?? a.name,
    type: a.type ?? 'PERSONAL',
  }))
  const result = { accounts }
  gbpAccountsCache.set(cacheKey, { data: result, expiresAt: Date.now() + GBP_ACCOUNTS_CACHE_TTL_MS })
  return result
})
