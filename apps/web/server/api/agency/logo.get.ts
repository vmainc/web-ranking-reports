import type PocketBase from 'pocketbase'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

const VMA_ADMIN_EMAIL = 'admin@vma.agency'
const WRR_DEFAULT_LOGO_PATH = '/images/branding/wrr-logo.svg'

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
  // If the caller is not authenticated (public report), always use WRR default logo.
  const userId = await getUserIdFromRequest(event).catch(() => null)

  const pb = getAdminPb()
  await adminAuth(pb)

  // Temporary safeguard while agency branding is global:
  // only VMA admin account can resolve the custom agency logo.
  if (!userId) return sendRedirect(event, WRR_DEFAULT_LOGO_PATH, 302)
  const user = await pb.collection('users').getOne<{ email?: string }>(userId).catch(() => null)
  const email = String(user?.email || '').trim().toLowerCase()
  if (email !== VMA_ADMIN_EMAIL) return sendRedirect(event, WRR_DEFAULT_LOGO_PATH, 302)

  let record: { id: string; logo?: string | string[] } | undefined
  try {
    const list = await pb.collection('agency').getFullList<{ id: string; logo?: string | string[] }>({ limit: 1 })
    record = list[0]
  } catch {
    return sendRedirect(event, WRR_DEFAULT_LOGO_PATH, 302)
  }
  if (!record) return sendRedirect(event, WRR_DEFAULT_LOGO_PATH, 302)

  const logo = record.logo
  const filename =
    typeof logo === 'string' ? logo
    : Array.isArray(logo) && logo.length > 0 ? logo[0]
    : null
  if (!filename || typeof filename !== 'string') return sendRedirect(event, WRR_DEFAULT_LOGO_PATH, 302)

  const config = useRuntimeConfig()
  // Important: this URL is sent to the browser via redirect, so it must be publicly reachable
  // and HTTPS in production. Prefer public pocketbase URL before any internal Docker URL.
  const base = (
    (config.public?.pocketbaseUrl as string) ||
    (config.pbUrl as string) ||
    'http://127.0.0.1:8090'
  ).replace(/\/+$/, '')
  const collectionId = await getCollectionId(pb, 'agency')
  const fileUrl = `${base}/api/files/${collectionId}/${record.id}/${encodeURIComponent(filename)}`
  return sendRedirect(event, fileUrl, 302)
})
