import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import {
  assertCatalogSiteOwned,
  getProposalSettings,
  saveProposalSettings,
  type ProposalBrandSettings,
} from '~/server/utils/proposalCatalog'
import { proposalBrandPatchSchema } from '~/lib/proposalSchemas'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH' && getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  }
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)

  const body = (await readBody(event).catch(() => ({}))) as {
    catalog_site_id?: string | null
    brand?: unknown
  }

  const current = await getProposalSettings(pb, crmOwnerId)
  let catalogSiteId = current.catalog_site_id
  if (body.catalog_site_id !== undefined) {
    catalogSiteId =
      body.catalog_site_id === null || body.catalog_site_id === ''
        ? null
        : typeof body.catalog_site_id === 'string'
          ? body.catalog_site_id.trim()
          : null
    if (catalogSiteId) {
      await assertCatalogSiteOwned(pb, crmOwnerId, catalogSiteId)
    }
  }

  let brand: ProposalBrandSettings | undefined
  if (body.brand !== undefined) {
    const parsed = proposalBrandPatchSchema.safeParse(body.brand)
    if (!parsed.success) {
      throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid brand' })
    }
    brand = { ...current.brand, ...parsed.data }
  }

  if (body.catalog_site_id === undefined && brand === undefined) {
    throw createError({ statusCode: 400, message: 'Provide catalog_site_id and/or brand to update' })
  }

  const settings = await saveProposalSettings(pb, crmOwnerId, {
    catalog_site_id: catalogSiteId,
    brand,
  })
  return { settings }
})
