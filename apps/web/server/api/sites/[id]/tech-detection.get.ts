import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { detectSiteTechnologies } from '~/server/utils/techDetection'

/** Detect technologies on the site (WordPress, Analytics, GTM, Cloudflare, WooCommerce). On-demand scan. */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const site = await assertSiteOwnership(pb, siteId, userId)
  const domain = (site.domain || '').trim()
  if (!domain) throw createError({ statusCode: 400, message: 'Site has no domain configured' })

  try {
    const result = await detectSiteTechnologies(domain)
    return result
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw createError({
      statusCode: 502,
      message: `Could not scan site: ${msg}. Check the domain and that the site is reachable.`,
    })
  }
})
