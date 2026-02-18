import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getGAAccessToken } from '~/server/utils/gaAccess'

const WEBMASTERS_SCOPE = 'webmasters'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const siteId = (query.siteId ?? query.siteid) as string
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const { accessToken, integration } = await getGAAccessToken(pb, siteId)
  const scope = (integration.config_json?.google as { scope?: string })?.scope ?? ''
  if (!scope.split(' ').some((s) => s.includes(WEBMASTERS_SCOPE))) {
    throw createError({
      statusCode: 400,
      message: "Your Google connection doesn't include Search Console access. Disconnect and reconnect Google.",
    })
  }

  const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw createError({ statusCode: res.status, message: `Search Console API: ${res.status} ${text}` })
  }
  const data = (await res.json()) as { siteEntry?: Array<{ siteUrl?: string; permissionLevel?: string }> }
  const entries = data.siteEntry ?? []
  const sites = entries.map((e) => ({
    siteUrl: e.siteUrl ?? '',
    permissionLevel: e.permissionLevel,
  }))

  return { sites }
})
