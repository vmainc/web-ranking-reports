import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getGAAccessToken } from '~/server/utils/gaAccess'

/** List locations for a GBP account. */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = query.siteId as string
  const accountId = query.accountId as string
  if (!siteId || !accountId) throw createError({ statusCode: 400, message: 'siteId and accountId required' })

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
  return { locations, nextPageToken: data.nextPageToken, totalSize: data.totalSize }
})
