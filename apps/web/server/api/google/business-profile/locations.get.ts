import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getGAAccessToken } from '~/server/utils/gaAccess'

const GBP_LOCATIONS_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const gbpLocationsCache = new Map<string, { data: { locations: Array<{ name: string; locationId: string; locationName: string; address: string }>; nextPageToken?: string; totalSize?: number }; expiresAt: number }>()

/** List locations for a GBP account. Cached 5 min to reduce rate limits. */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = query.siteId as string
  const accountId = query.accountId as string
  if (!siteId || !accountId) throw createError({ statusCode: 400, message: 'siteId and accountId required' })

  const cacheKey = `gbp_locations:${siteId}:${accountId}`
  const cached = gbpLocationsCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) return cached.data

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const { accessToken } = await getGAAccessToken(pb, siteId)

  const parent = `accounts/${accountId}`
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${parent}/locations?pageSize=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) {
    const text = await res.text()
    if (res.status === 429) {
      const stale = gbpLocationsCache.get(cacheKey)
      if (stale?.data.locations?.length) {
        setResponseStatus(event, 200)
        return { ...stale.data, rateLimited: true }
      }
      setResponseStatus(event, 200)
      return { locations: [], rateLimited: true }
    }
    if (res.status === 403) {
      try {
        const err = JSON.parse(text) as { error?: { message?: string } }
        const msg = err?.error?.message ?? ''
        if (/Access Not Configured|not enabled/i.test(msg)) {
          throw createError({
            statusCode: 403,
            message: 'Google Business Profile locations API is not enabled. An admin must enable "Google My Business API" in the Google Cloud project (APIs & Services → Library, search "Google My Business"). Then disconnect and reconnect Google on Integrations to ensure permissions are granted.',
            data: { code: 'API_NOT_ENABLED', enableUrl: 'https://console.cloud.google.com/apis/library' },
          })
        }
      } catch (e) {
        if (e && typeof e === 'object' && 'statusCode' in e && (e as { statusCode: number }).statusCode === 403) throw e
      }
      throw createError({
        statusCode: 403,
        message: 'Google Business Profile locations access denied. Enable "Google My Business API" in the Google Cloud project (APIs & Services → Library), then disconnect and reconnect Google on Integrations.',
        data: { code: 'LOCATIONS_FORBIDDEN', enableUrl: 'https://console.cloud.google.com/apis/library' },
      })
    }
    throw createError({ statusCode: res.status, message: `Business Profile locations: ${res.status} ${text.slice(0, 200)}` })
  }

  const data = (await res.json()) as {
    locations?: Array<{ name: string; locationName?: string; storeCode?: string; address?: { addressLines?: string[] } }>
    nextPageToken?: string
    totalSize?: number
  }
  const locations = (data.locations ?? []).map((loc) => {
    const name = loc.name || ''
    const id = name.split('/').pop() || name
    return {
      name: loc.name,
      locationId: id,
      locationName: loc.locationName ?? loc.storeCode ?? id,
      address: loc.address?.addressLines?.join(', ') ?? '',
    }
  })
  const result = { locations, nextPageToken: data.nextPageToken, totalSize: data.totalSize }
  gbpLocationsCache.set(cacheKey, { data: result, expiresAt: Date.now() + GBP_LOCATIONS_CACHE_TTL_MS })
  return result
})
