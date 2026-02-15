import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

const GOOGLE_ANCHOR = 'google_analytics'

/** Returns another site of the same user that has Google Analytics connected, if any (for "Use existing account"). */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = query.siteId as string
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const userSites = await pb.collection('sites').getFullList<{ id: string; name: string }>({
    filter: `user = "${userId}"`,
  })
  const otherSiteIds = userSites.filter((s) => s.id !== siteId).map((s) => s.id)
  if (otherSiteIds.length === 0) return { otherSiteId: null, otherSiteName: null }

  for (const sid of otherSiteIds) {
    const list = await pb.collection('integrations').getFullList<{ id: string }>({
      filter: `site = "${sid}" && provider = "${GOOGLE_ANCHOR}" && status = "connected"`,
    })
    if (list.length > 0) {
      const site = userSites.find((s) => s.id === sid)
      return { otherSiteId: sid, otherSiteName: site?.name ?? null }
    }
  }
  return { otherSiteId: null, otherSiteName: null }
})
