import { getRouterParam, sendRedirect } from 'h3'
import type PocketBase from 'pocketbase'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'
import { applyPublicCors } from '~/server/utils/publicCors'
import { resolveOwnerIdByPublicKey, getWebsiteAuditFormSettings } from '~/server/utils/websiteAuditForm'
import { userCanUseAgencyWhiteLabel } from '~/server/services/subscriptions'

const WRR_DEFAULT_LOGO_PATH = '/images/branding/wrr-logo.svg'

async function getCollectionId(pb: PocketBase, name: string): Promise<string> {
  const list = await pb.collections.getFullList()
  const col = list.find((c: { name?: string }) => c.name === name) as { id: string } | undefined
  return col?.id ?? name
}

/** Public logo for embed branding (white-label when plan allows). */
export default defineEventHandler(async (event) => {
  applyPublicCors(event)
  const key = getRouterParam(event, 'key')
  if (!key) return sendRedirect(event, WRR_DEFAULT_LOGO_PATH, 302)

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await resolveOwnerIdByPublicKey(pb, key)
  if (!ownerId) return sendRedirect(event, WRR_DEFAULT_LOGO_PATH, 302)

  const settings = await getWebsiteAuditFormSettings(pb, ownerId)
  if (settings.publicKey !== key) return sendRedirect(event, WRR_DEFAULT_LOGO_PATH, 302)

  if (!(await userCanUseAgencyWhiteLabel(pb, ownerId))) {
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
    typeof logo === 'string' ? logo : Array.isArray(logo) && logo.length > 0 ? logo[0] : null
  if (!filename || typeof filename !== 'string') return sendRedirect(event, WRR_DEFAULT_LOGO_PATH, 302)

  const config = useRuntimeConfig()
  const base = (
    (config.public?.pocketbaseUrl as string) ||
    (config.pbUrl as string) ||
    'http://127.0.0.1:8090'
  ).replace(/\/+$/, '')
  const collectionId = await getCollectionId(pb, 'agency')
  const fileUrl = `${base}/api/files/${collectionId}/${record.id}/${encodeURIComponent(filename)}`
  return sendRedirect(event, fileUrl, 302)
})
