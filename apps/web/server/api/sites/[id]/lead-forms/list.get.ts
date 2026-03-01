import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)
  let list: unknown[]
  try {
    list = await pb.collection('lead_forms').getFullList({ filter: 'site = "' + siteId + '"', sort: '-updated' })
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string }
    if (err?.status === 404 || (err?.message && /requested resource wasn't found|collection.*not found/i.test(String(err.message)))) {
      throw createError({
        statusCode: 503,
        message: 'Lead Generation is not set up. Create the PocketBase collections by running: cd apps/web && node scripts/create-collections.mjs (with PocketBase running and PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD set).',
      })
    }
    throw e
  }
  return { forms: list }
})
