import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { assertSiteAccess } from '~/server/utils/workspace'
import { getDataForSeoCredentials } from '~/server/utils/dataforseo'
import { fetchBacklinksProfile } from '~/server/utils/dataforseoBacklinks'

/**
 * On-demand Backlinks API bundle (5 DataForSEO live calls). Same credentials as rank tracking.
 */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const { site } = await assertSiteAccess(pb, siteId, userId, false)

  const domain = site.domain?.trim()
  if (!domain) throw createError({ statusCode: 400, message: 'Site has no domain' })

  const credentials = await getDataForSeoCredentials(pb)
  if (!credentials) {
    throw createError({
      statusCode: 503,
      message: 'DataForSEO is not configured. An admin can add credentials in Admin → Integrations.',
    })
  }

  const data = await fetchBacklinksProfile(credentials, domain)
  try {
    await pb.collection('sites').update(siteId, { backlinks_snapshot: data as unknown as Record<string, unknown> })
  } catch {
    // Collection may be missing `backlinks_snapshot` until migration: node scripts/add-sites-backlinks-snapshot-field.mjs
  }
  return data
})
