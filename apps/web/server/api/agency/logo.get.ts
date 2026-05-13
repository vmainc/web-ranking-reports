import type PocketBase from 'pocketbase'
import { getQuery, type H3Event } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { resolvePdfToken } from '~/server/utils/pdfToken'
import { userCanUseAgencyWhiteLabel } from '~/server/services/subscriptions'

const WRR_DEFAULT_LOGO_PATH = '/images/branding/wrr-logo.svg'

/** Resolve PocketBase collection id by name (for file URL). */
async function getCollectionId(pb: PocketBase, name: string): Promise<string> {
  const list = await pb.collections.getFullList()
  const col = list.find((c: { name?: string }) => c.name === name) as { id: string } | undefined
  return col?.id ?? name
}

async function resolveLogoUserId(event: H3Event): Promise<string | null> {
  const fromAuth = await getUserIdFromRequest(event).catch(() => null)
  if (fromAuth) return fromAuth
  const raw = getQuery(event).pdf_token
  const pdfTok = (typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '')?.trim() || ''
  if (!pdfTok) return null
  const pdf = resolvePdfToken(pdfTok)
  return pdf?.userId ?? null
}

/** Serve the agency logo image for reports.
 * Publicly reachable redirect (PDF / img tags); gated by white-label plan when a user/pdf_token is present.
 */
export default defineEventHandler(async (event) => {
  const pb = getAdminPb()
  await adminAuth(pb)

  const userId = await resolveLogoUserId(event)
  if (!userId || !(await userCanUseAgencyWhiteLabel(pb, userId))) {
    return sendRedirect(event, WRR_DEFAULT_LOGO_PATH, 302)
  }

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
