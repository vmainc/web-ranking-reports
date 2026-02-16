import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getGAAccessToken } from '~/server/utils/gaAccess'

/** List Google Business Profile accounts (same Google token). */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = query.siteId as string
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const { accessToken } = await getGAAccessToken(pb, siteId)

  const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    if (res.status === 403) {
      throw createError({
        statusCode: 403,
        message: 'Google Business Profile access not granted. Disconnect Google on this site’s Integrations page, then connect again so we can request Business Profile access.',
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
  return { accounts }
})
