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
      throw createError({
        statusCode: 429,
        message: 'Google Business Profile API rate limit reached. Please wait a minute and try again—no need to reconnect.',
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
