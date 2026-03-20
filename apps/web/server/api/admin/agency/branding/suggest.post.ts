import type PocketBase from 'pocketbase'
import { getAdminPb, adminAuth, getUserIdFromRequest, getAdminEmails } from '~/server/utils/pbServer'
import { detectBrandingFromLogo, saveBrandingColors } from '~/server/utils/branding'

async function getCollectionId(pb: PocketBase, name: string): Promise<string> {
  const list = await pb.collections.getFullList()
  const col = list.find((c: { name?: string }) => c.name === name) as { id: string } | undefined
  return col?.id ?? name
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const allowUnauthedDev = import.meta.dev
  const userId = allowUnauthedDev ? null : await getUserIdFromRequest(event)
  if (!userId && !allowUnauthedDev) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  if (!allowUnauthedDev && userId) {
    const adminEmails = getAdminEmails().map((e) => e.toLowerCase().trim())
    const userRecord = await pb.collection('users').getOne<{ email?: string }>(userId)
    const userEmail = userRecord?.email?.toLowerCase?.().trim() || ''
    if (!userEmail || !adminEmails.includes(userEmail)) throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const list = await pb.collection('agency').getFullList<{ id: string; logo?: string | string[] }>({ limit: 1 })
  const record = list[0]
  if (!record) throw createError({ statusCode: 404, message: 'No agency record found.' })

  const logo = record.logo
  const filename =
    typeof logo === 'string' ? logo
    : Array.isArray(logo) && logo.length > 0 ? logo[0]
    : null
  if (!filename || typeof filename !== 'string') {
    throw createError({ statusCode: 404, message: 'No agency logo found. Upload a logo first.' })
  }

  const config = useRuntimeConfig()
  const base = (
    (config.pbUrl as string) ||
    (config.public?.pocketbaseUrl as string) ||
    'http://127.0.0.1:8090'
  ).replace(/\/+$/, '')
  const collectionId = await getCollectionId(pb, 'agency')
  const fileUrl = `${base}/api/files/${collectionId}/${record.id}/${encodeURIComponent(filename)}`

  const fileRes = await fetch(fileUrl)
  if (!fileRes.ok) {
    throw createError({ statusCode: 502, message: `Could not read logo file (${fileRes.status}).` })
  }
  const contentType = fileRes.headers.get('content-type') || 'image/png'
  const arrayBuf = await fileRes.arrayBuffer()

  const detected = await detectBrandingFromLogo(pb, new Uint8Array(arrayBuf), contentType)
  if (!detected) {
    throw createError({ statusCode: 422, message: 'Claude could not derive colors from this logo. Try another image.' })
  }

  await saveBrandingColors(pb, detected)
  return { ok: true, colors: detected }
})

