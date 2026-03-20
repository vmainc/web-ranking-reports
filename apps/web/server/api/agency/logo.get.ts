import type PocketBase from 'pocketbase'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

/** Resolve PocketBase collection id by name (for file URL). */
async function getCollectionId(pb: PocketBase, name: string): Promise<string> {
  const list = await pb.collections.getFullList()
  const col = list.find((c: { name?: string }) => c.name === name) as { id: string } | undefined
  return col?.id ?? name
}

/** Serve the agency logo image for reports.
 * Publicly accessible because reports can be viewed without an app login.
 */
export default defineEventHandler(async (event) => {
  // If the caller is not authenticated, we still allow loading the logo (used by public report pages).
  // We keep PB admin auth for reading the stored file server-side.
  await getUserIdFromRequest(event).catch(() => null)

  const pb = getAdminPb()
  await adminAuth(pb)

  let record: { id: string; logo?: string | string[] }
  try {
    const list = await pb.collection('agency').getFullList<{ id: string; logo?: string | string[] }>({ limit: 1 })
    record = list[0]
  } catch {
    throw createError({ statusCode: 404, message: 'No agency logo' })
  }
  if (!record) throw createError({ statusCode: 404, message: 'No agency logo' })

  const logo = record.logo
  const filename =
    typeof logo === 'string' ? logo
    : Array.isArray(logo) && logo.length > 0 ? logo[0]
    : null
  if (!filename || typeof filename !== 'string') throw createError({ statusCode: 404, message: 'No agency logo' })

  const config = useRuntimeConfig()
  const base = (
    (config.pbUrl as string) ||
    (config.public?.pocketbaseUrl as string) ||
    'http://127.0.0.1:8090'
  ).replace(/\/+$/, '')
  const collectionId = await getCollectionId(pb, 'agency')
  const fileUrl = `${base}/api/files/${collectionId}/${record.id}/${encodeURIComponent(filename)}`
  return sendRedirect(event, fileUrl, 302)
})
