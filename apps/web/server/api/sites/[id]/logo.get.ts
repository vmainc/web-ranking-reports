import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

/** Serve the site logo image. Requires auth; user must own the site. */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const site = await assertSiteOwnership(pb, siteId, userId) as { id: string; user: string; name: string; domain: string; logo?: string | string[] }
  const logo = site.logo
  const filename =
    typeof logo === 'string' ? logo
    : Array.isArray(logo) && logo.length > 0 ? logo[0]
    : null
  if (!filename || (typeof filename !== 'string')) throw createError({ statusCode: 404, message: 'No logo' })

  const config = useRuntimeConfig()
  const baseUrl = ((config.pbUrl as string) || '').replace(/\/+$/, '')
  const fileUrl = `${baseUrl}/api/files/sites/${siteId}/${encodeURIComponent(filename)}`
  const token = pb.authStore.token
  const res = await fetch(fileUrl, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw createError({ statusCode: res.status === 404 ? 404 : 502, message: 'Logo not found' })

  const contentType = res.headers.get('content-type') || 'application/octet-stream'
  const buffer = await res.arrayBuffer()
  setResponseHeaders(event, { 'Content-Type': contentType, 'Cache-Control': 'private, max-age=300' })
  return buffer
})
