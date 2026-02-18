import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import { getGAAccessToken } from '~/server/utils/gaAccess'

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
  const gscSiteUrl = (integration.config_json as Record<string, unknown>)?.gsc_site_url as string | undefined
  if (!gscSiteUrl) {
    throw createError({ statusCode: 400, message: 'Select a Search Console property first.' })
  }

  const encodedSite = encodeURIComponent(gscSiteUrl)
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    if (res.status === 403) {
      let detail = ''
      try {
        const err = JSON.parse(text) as { error?: { message?: string } }
        if (err?.error?.message) detail = ` Google: ${err.error.message}`
      } catch {
        /* ignore */
      }
      throw createError({
        statusCode: 403,
        message: `Search Console returned 403. Reconnect Google (button below) to grant Search Console permission.${detail}`,
      })
    }
    throw createError({ statusCode: res.status, message: `Search Console API: ${res.status} ${text}` })
  }
  const data = (await res.json()) as { sitemap?: Array<{ path?: string; lastSubmitted?: string; isPending?: boolean; isSitemapsIndex?: boolean; type?: string; warnings?: string; errors?: string }> }
  const sitemaps = (data.sitemap ?? []).map((s) => ({
    path: s.path ?? '—',
    lastSubmitted: s.lastSubmitted ?? '',
    isPending: !!s.isPending,
    type: s.type ?? '',
    warnings: typeof s.warnings === 'string' ? s.warnings : '',
    errors: typeof s.errors === 'string' ? s.errors : '',
  }))
  return { siteUrl: gscSiteUrl, sitemaps }
})
