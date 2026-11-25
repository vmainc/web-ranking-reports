import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { crmRowOwnedByUser, requireCrmOwnerId } from '~/server/utils/workspace'
import { servicePackagePatchSchema } from '~/lib/servicePackageSchemas'
import { rethrowIfMissingCollection } from '~/server/utils/pbMissingCollection'
import type { ProposalServicePackage } from '~/types'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const id = String(event.context.params?.id || '')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const existing = await pb.collection('proposal_service_packages').getOne(id).catch(() => null)
  if (!existing || !crmRowOwnedByUser(existing as { user?: unknown }, crmOwnerId)) {
    throw createError({ statusCode: 404, message: 'Package not found' })
  }

  const raw = await readBody(event).catch(() => ({}))
  const parsed = servicePackagePatchSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid package' })
  }
  const body = parsed.data
  const updates: Record<string, unknown> = {}

  if (body.sku !== undefined) {
    const sku = body.sku.trim()
    const esc = crmOwnerId.replace(/"/g, '\\"')
    const skuEsc = sku.replace(/"/g, '\\"')
    const dup = await pb
      .collection('proposal_service_packages')
      .getFirstListItem(`user = "${esc}" && sku = "${skuEsc}" && id != "${id}"`)
      .catch(() => null)
    if (dup) throw createError({ statusCode: 409, message: 'A package with this SKU already exists' })
    updates.sku = sku
  }
  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.description_html !== undefined) updates.description_html = body.description_html?.trim() || null
  if (body.default_unit_price !== undefined) updates.default_unit_price = body.default_unit_price
  if (body.billing_interval !== undefined) updates.billing_interval = body.billing_interval
  if (body.category !== undefined) updates.category = body.category || null
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order
  if (body.active !== undefined) updates.active = body.active
  if (body.stripe_product_id !== undefined) updates.stripe_product_id = body.stripe_product_id?.trim() || null
  if (body.stripe_price_id !== undefined) updates.stripe_price_id = body.stripe_price_id?.trim() || null

  if (!Object.keys(updates).length) {
    return { package: existing as ProposalServicePackage }
  }

  try {
    const row = await pb.collection('proposal_service_packages').update(id, updates)
    return { package: row as ProposalServicePackage }
  } catch (e: unknown) {
    rethrowIfMissingCollection(e, 'proposal_service_packages')
  }
})