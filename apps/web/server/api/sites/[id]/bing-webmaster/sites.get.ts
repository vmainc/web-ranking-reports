import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getBingWebmasterConfig, bingWebmasterGet } from '~/server/utils/bingWebmasterAccess'

/** Bing GetUserSites response: { d: Array<{ Url: string; IsVerified: boolean; ... }> } */
interface BingSite {
  Url?: string
  IsVerified?: boolean
  DnsVerificationCode?: string
  AuthenticationCode?: string
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const config = await getBingWebmasterConfig(pb, siteId)
  const data = await bingWebmasterGet<{ d?: BingSite[]; Message?: string }>(config.api_key, 'GetUserSites')
  if (data.Message) throw createError({ statusCode: 400, message: data.Message })
  const sites = Array.isArray(data.d) ? data.d : []
  return {
    sites: sites.map((s) => ({
      url: s.Url ?? '',
      isVerified: s.IsVerified ?? false,
    })),
  }
})
