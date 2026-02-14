import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getGAAccessToken } from '~/server/utils/gaAccess'

/** GA4 Admin API: list account summaries (accounts + properties). */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getQuery(event).siteId as string
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const { accessToken } = await getGAAccessToken(pb, siteId)

  const res = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=100', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const text = await res.text()

  if (!res.ok) {
    console.error('GA accountSummaries', res.status, text)
    const hint =
      res.status === 403
        ? 'Enable "Google Analytics Admin API" in Google Cloud Console for your project.'
        : 'Check that your Google account has access to GA4 properties.'
    throw createError({ statusCode: 502, message: `Could not list GA properties. ${hint}` })
  }

  let data: {
    accountSummaries?: Array<{
      account?: string
      displayName?: string
      propertySummaries?: Array<{ property?: string; displayName?: string }>
    }>
  }
  try {
    data = JSON.parse(text) as typeof data
  } catch {
    throw createError({ statusCode: 502, message: 'Invalid response from Google Analytics.' })
  }

  const properties: Array<{ id: string; name: string; accountName?: string }> = []
  const summaries = data.accountSummaries ?? []
  for (const acc of summaries) {
    const accountName = acc.displayName ?? ''
    const list = acc.propertySummaries ?? []
    for (const p of list) {
      const raw = p.property ?? ''
      const propId = raw.startsWith('properties/') ? raw.slice('properties/'.length) : raw
      if (propId) {
        properties.push({
          id: propId,
          name: p.displayName ?? propId,
          accountName,
        })
      }
    }
  }

  const hint =
    properties.length === 0
      ? 'No GA4 properties found. Create a GA4 property in Google Analytics or link an existing one to this Google account.'
      : undefined

  return { properties, hint }
})
