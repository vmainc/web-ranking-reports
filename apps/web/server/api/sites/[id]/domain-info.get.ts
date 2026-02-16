import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getDomainInfo, normalizeDomain } from '~/server/utils/domainInfo'

/** Domain whois + DNS for the site's domain. Cached 24h; use ?refresh=1 to force update. */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const site = await assertSiteOwnership(pb, siteId, userId)
  const domain = normalizeDomain(site.domain)
  if (!domain) throw createError({ statusCode: 400, message: 'Site has no domain configured' })

  let row: { value: { api_key?: string } }
  try {
    row = await pb.collection('app_settings').getFirstListItem<{ value: { api_key?: string } }>('key="apilayer_whois"')
  } catch {
    throw createError({
      statusCode: 503,
      message: 'Domain lookup is not configured. An admin can add a Whois API key in Admin → Integrations.',
    })
  }
  const apiKey = row?.value?.api_key?.trim()
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      message: 'Domain lookup is not configured. An admin can add a Whois API key in Admin → Integrations.',
    })
  }

  const query = getQuery(event)
  const forceRefresh = query.refresh === '1' || query.refresh === 'true'

  try {
    const data = await getDomainInfo(domain, apiKey, forceRefresh)
    return data
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Domain lookup failed'
    throw createError({ statusCode: 502, message: msg })
  }
})
