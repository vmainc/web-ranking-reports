import { getQuery } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { getProposalSettings } from '~/server/utils/proposalCatalog'
import { rethrowIfMissingCollection } from '~/server/utils/pbMissingCollection'
import type { ProposalProduct } from '~/types'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const query = getQuery(event)
  const status = typeof query.status === 'string' ? query.status : 'publish'
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const settings = await getProposalSettings(pb, crmOwnerId)

  let filter = `user = "${crmOwnerId.replace(/"/g, '\\"')}"`
  if (settings.catalog_site_id) {
    filter += ` && catalog_site = "${settings.catalog_site_id.replace(/"/g, '\\"')}"`
  }
  if (status && status !== 'all') {
    filter += ` && status = "${status.replace(/"/g, '\\"')}"`
  }
  if (search) {
    const q = search.replace(/"/g, '')
    filter += ` && (name ~ "${q}" || sku ~ "${q}")`
  }

  let products: ProposalProduct[]
  try {
    products = await pb.collection('proposal_products').getFullList<ProposalProduct>({
      filter,
      sort: 'name',
    })
  } catch (e: unknown) {
    rethrowIfMissingCollection(e, 'proposal_products')
  }
  return {
    products,
    catalog_site_id: settings.catalog_site_id,
  }
})
