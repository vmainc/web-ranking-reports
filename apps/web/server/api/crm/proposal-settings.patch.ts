import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import {
  assertCatalogSiteOwned,
  saveProposalSettings,
} from '~/server/utils/proposalCatalog'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH' && getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  }
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)

  const body = (await readBody(event).catch(() => ({}))) as { catalog_site_id?: string | null }
  let catalogSiteId =
    body.catalog_site_id === null || body.catalog_site_id === ''
      ? null
      : typeof body.catalog_site_id === 'string'
        ? body.catalog_site_id.trim()
        : undefined

  if (catalogSiteId === undefined) {
    throw createError({ statusCode: 400, message: 'catalog_site_id is required (string or null)' })
  }
  if (catalogSiteId) {
    await assertCatalogSiteOwned(pb, crmOwnerId, catalogSiteId)
  }

  const settings = await saveProposalSettings(pb, crmOwnerId, { catalog_site_id: catalogSiteId })
  return { settings }
})
