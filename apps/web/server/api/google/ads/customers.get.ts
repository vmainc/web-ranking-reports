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

  const { accessToken } = await getAdsAccessToken(pb, siteId)

  const res = await $fetch<{ resourceNames?: string[] }>(
    'https://googleads.googleapis.com/v20/customers:listAccessibleCustomers',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': devToken,
      },
    }
  ).catch((e: unknown) => {
    const msg = e && typeof e === 'object' && 'data' in e && (e as { data?: { message?: string } }).data?.message
      ? (e as { data: { message: string } }).data.message
      : e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 502, message: msg || 'Google Ads API error' })
  })

  const resourceNames = res?.resourceNames ?? []
  const customers = resourceNames.map((rn: string) => {
    const id = rn.replace(/^customers\//, '')
    return { resourceName: rn, customerId: id, name: id }
  })

  return { customers }
})
