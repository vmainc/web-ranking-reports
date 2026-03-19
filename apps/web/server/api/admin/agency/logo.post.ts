import { readMultipartFormData } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB

/** Upload agency logo. Admin only. Accepts multipart form field "logo". */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const allowUnauthedDev = import.meta.dev
  const userId = await getUserIdFromRequest(event)
  if (!userId && !allowUnauthedDev) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const adminEmails = getAdminEmails()
  const pb = getAdminPb()
  await adminAuth(pb)
  if (userId) {
    const userRecord = await pb.collection('users').getOne<{ email?: string }>(userId)
    const userEmail = userRecord?.email?.toLowerCase?.()
    if (!userEmail || !adminEmails.map((e: string) => e.toLowerCase()).includes(userEmail)) {
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }

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

  const config = useRuntimeConfig()
  const baseUrl = (
    (config.pbUrl as string) ||
    (config.public?.pocketbaseUrl as string) ||
    'http://127.0.0.1:8090'
  ).replace(/\/+$/, '')

  let recordId: string
  try {
    const list = await pb.collection('agency').getFullList<{ id: string }>({ limit: 1 })
    if (list.length > 0) {
      recordId = list[0].id
    } else {
      const created = await pb.collection('agency').create({})
      recordId = created.id
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('collection') || msg.includes('404') || msg.includes('not found')) {
      throw createError({
        statusCode: 503,
        message: 'agency collection missing. Run: node scripts/create-collections.mjs',
      })
    }
    throw createError({ statusCode: 500, message: msg })
  }

  const patchUrl = `${baseUrl}/api/collections/agency/records/${recordId}`
  const formData = new FormData()
  const blob = new Blob([logoPart.data], { type: logoPart.type || 'application/octet-stream' })
  formData.append('logo', blob, logoPart.filename)

  const res = await fetch(patchUrl, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${pb.authStore.token}` },
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
