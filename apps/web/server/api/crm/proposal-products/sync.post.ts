import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import {
  assertCatalogSiteOwned,
  getProposalSettings,
  parseWooPrice,
  stripHtml,
} from '~/server/utils/proposalCatalog'
import { fetchAllWooProducts, getWooCommerceConfig } from '~/server/utils/woocommerceAccess'

/**
 * Sync WooCommerce products from the agency catalog site into proposal_products.
 * Soft-archives local rows missing from Woo.
 */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)

  const body = (await readBody(event).catch(() => ({}))) as { catalog_site_id?: string }
  const settings = await getProposalSettings(pb, crmOwnerId)
  const catalogSiteId = (body.catalog_site_id || settings.catalog_site_id || '').trim()
  if (!catalogSiteId) {
    throw createError({
      statusCode: 400,
      message: 'No catalog site configured. Set one under CRM → Proposals → Catalog settings.',
    })
  }
  await assertCatalogSiteOwned(pb, crmOwnerId, catalogSiteId)

  const wooConfig = await getWooCommerceConfig(pb, catalogSiteId)
  const wooProducts = await fetchAllWooProducts(wooConfig)
  const syncedAt = new Date().toISOString()
  const escOwner = crmOwnerId.replace(/"/g, '\\"')
  const escSite = catalogSiteId.replace(/"/g, '\\"')

  const existing = await pb.collection('proposal_products').getFullList<{
    id: string
    external_id: string
  }>({
    filter: `user = "${escOwner}" && catalog_site = "${escSite}"`,
    fields: 'id,external_id',
    batch: 500,
  })
  const byExternal = new Map(existing.map((r) => [String(r.external_id), r.id]))
  const seen = new Set<string>()

  let created = 0
  let updated = 0

  for (const p of wooProducts) {
    const externalId = String(p.id)
    seen.add(externalId)
    const wooStatus = String(p.status || 'publish').toLowerCase()
    const localStatus =
      wooStatus === 'publish' ? 'publish' : wooStatus === 'draft' || wooStatus === 'pending' ? 'draft' : 'archived'
    const price = parseWooPrice(p.price || p.sale_price || p.regular_price)
    const regular = parseWooPrice(p.regular_price)
    const sale = parseWooPrice(p.sale_price)
    const description = stripHtml(p.short_description || p.description, 5000)
    const imageUrl = p.images?.[0]?.src || null
    const payload = {
      user: crmOwnerId,
      catalog_site: catalogSiteId,
      external_id: externalId,
      sku: (p.sku || '').trim() || null,
      name: (p.name || `Product #${externalId}`).trim().slice(0, 255),
      description: description || null,
      price,
      regular_price: regular || null,
      sale_price: sale || null,
      currency: 'USD',
      status: localStatus,
      woo_status: wooStatus,
      image_url: imageUrl,
      permalink: p.permalink || null,
      raw_json: {
        id: p.id,
        type: p.type,
        status: p.status,
        sku: p.sku,
        slug: p.slug,
      },
      synced_at: syncedAt,
    }

    const existingId = byExternal.get(externalId)
    if (existingId) {
      await pb.collection('proposal_products').update(existingId, payload)
      updated += 1
    } else {
      await pb.collection('proposal_products').create(payload)
      created += 1
    }
  }

  let archived = 0
  for (const row of existing) {
    if (!seen.has(String(row.external_id))) {
      await pb.collection('proposal_products').update(row.id, {
        status: 'archived',
        woo_status: 'missing',
        synced_at: syncedAt,
      })
      archived += 1
    }
  }

  return {
    ok: true,
    catalog_site_id: catalogSiteId,
    fetched: wooProducts.length,
    created,
    updated,
    archived,
    synced_at: syncedAt,
  }
})
