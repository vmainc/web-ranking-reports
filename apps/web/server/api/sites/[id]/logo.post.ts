import { getRouterParam, readMultipartFormData } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB

/** Upload site logo. Requires auth; user must own the site. Accepts multipart form field "logo". */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })

  const parts = await readMultipartFormData(event)
  const logoPart = parts?.find((p) => p.name === 'logo')
  if (!logoPart?.data || !logoPart.filename) {
    throw createError({
      statusCode: 400,
      message: 'Missing file. Use the file input and choose an image (field name must be "logo").',
    })
  }
  const size = logoPart.data.byteLength ?? (logoPart.data as Buffer).length
  if (size > MAX_SIZE) {
    throw createError({ statusCode: 400, message: 'File must be under 2MB.' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const config = useRuntimeConfig()
  const baseUrl = ((config.pbUrl as string) || '').replace(/\/+$/, '')
  const patchUrl = `${baseUrl}/api/collections/sites/records/${siteId}`
  const formData = new FormData()
  const blob = new Blob([logoPart.data], { type: logoPart.type || 'application/octet-stream' })
  formData.append('logo', blob, logoPart.filename)

  const token = pb.authStore.token
  const res = await fetch(patchUrl, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!res.ok) {
    const text = await res.text()
    let msg = `PocketBase returned ${res.status}`
    try {
      const json = JSON.parse(text) as { message?: string }
      if (json.message) msg = json.message
    } catch {
      if (text) msg = text.slice(0, 200)
    }
    throw createError({ statusCode: 502, message: msg })
  }
  return { ok: true }
})
