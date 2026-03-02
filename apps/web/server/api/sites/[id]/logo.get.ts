import { getRouterParam } from 'h3'
import type PocketBase from 'pocketbase'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

/** Resolve PocketBase collection id by name (for file URL). Uses collection id so file API works in all environments. */
async function getSitesCollectionId(pb: PocketBase): Promise<string> {
  const list = await pb.collections.getFullList()
  const sites = list.find((c: { name?: string }) => c.name === 'sites') as { id: string } | undefined
  return sites?.id ?? 'sites'
}

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
  const internalUrl = ((config.pbUrl as string) || '').replace(/\/+$/, '')
  const publicUrl = ((config.public?.pocketbaseUrl as string) || internalUrl || '').replace(/\/+$/, '')
  const authHeader = { Authorization: `Bearer ${pb.authStore.token}` }

  // Use collection id so /api/files/ works reliably (e.g. production PB)
  const collectionId = await getSitesCollectionId(pb)
  const filePath = `/api/files/${collectionId}/${siteId}/${encodeURIComponent(filename)}`

  function isImageResponse(res: Response): boolean {
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    return ct.startsWith('image/') || ct === 'application/octet-stream'
  }

  async function getFileToken(base: string): Promise<string | null> {
    try {
      const res = await fetch(`${base}/api/files/token`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { token?: string }
      return data?.token ?? null
    } catch {
      return null
    }
  }

  async function fetchFile(base: string, fileToken?: string | null): Promise<Response> {
    const url = fileToken ? `${base}${filePath}?token=${encodeURIComponent(fileToken)}` : `${base}${filePath}`
    return fetch(url, { headers: fileToken ? {} : authHeader })
  }

  const basesToTry = internalUrl ? [internalUrl] : []
  if (publicUrl && publicUrl !== internalUrl) basesToTry.push(publicUrl)

  let res: Response | null = null
  let buffer: ArrayBuffer | null = null
  let contentType = 'application/octet-stream'
  let lastStatus = 0
  let lastError = ''

  for (const base of basesToTry) {
    try {
      res = await fetchFile(base)
      lastStatus = res.status
      if (!res.ok) {
        lastError = await res.text().catch(() => res.statusText)
        continue
      }
      buffer = await res.arrayBuffer()
      contentType = res.headers.get('content-type') || contentType
      if (buffer?.byteLength && isImageResponse(res)) break
      const fileToken = await getFileToken(base)
      if (fileToken) {
        res = await fetchFile(base, fileToken)
        lastStatus = res.status
        if (res.ok && isImageResponse(res)) {
          buffer = await res.arrayBuffer()
          contentType = res.headers.get('content-type') || contentType
          break
        }
      }
      buffer = null
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
      buffer = null
    }
  }

  if (!buffer || buffer.byteLength === 0) {
    const msg = lastError || (lastStatus ? `PB returned ${lastStatus}` : 'Could not reach PocketBase')
    throw createError({ statusCode: 502, message: `Logo unavailable: ${msg}` })
  }
  if (!res || !isImageResponse(res)) {
    throw createError({ statusCode: 502, message: 'Logo not an image' })
  }

  setResponseHeaders(event, { 'Content-Type': contentType, 'Cache-Control': 'private, max-age=300' })
  return buffer
})
