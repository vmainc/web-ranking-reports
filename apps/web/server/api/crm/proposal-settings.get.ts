import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { extractPocketBaseRelationId, requireCrmOwnerId } from '~/server/utils/workspace'
import { getProposalSettings } from '~/server/utils/proposalCatalog'
import { getWooCommerceIntegration, hasWooCommerceConfig } from '~/server/utils/woocommerceAccess'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const settings = await getProposalSettings(pb, crmOwnerId)

  let catalog_site: { id: string; name: string; domain: string; woo_connected: boolean } | null = null
  if (settings.catalog_site_id) {
    const site = await pb
      .collection('sites')
      .getOne<{ id: string; name?: string; domain?: string; user?: unknown }>(settings.catalog_site_id)
      .catch(() => null)
    if (site && extractPocketBaseRelationId(site.user) === crmOwnerId) {
      const integration = await getWooCommerceIntegration(pb, site.id)
      catalog_site = {
        id: site.id,
        name: site.name || site.domain || site.id,
        domain: site.domain || '',
        woo_connected: hasWooCommerceConfig(integration),
      }
    }
  }

  const esc = crmOwnerId.replace(/"/g, '\\"')
  const sites = await pb.collection('sites').getFullList<{ id: string; name?: string; domain?: string }>({
    filter: `user = "${esc}" && lifecycle != "prospect"`,
    sort: 'name',
    fields: 'id,name,domain',
  })

  const siteOptions = []
  for (const s of sites) {
    const integration = await getWooCommerceIntegration(pb, s.id)
    siteOptions.push({
      id: s.id,
      name: s.name || s.domain || s.id,
      domain: s.domain || '',
      woo_connected: hasWooCommerceConfig(integration),
    })
  }

  return { settings, catalog_site, site_options: siteOptions }
})
