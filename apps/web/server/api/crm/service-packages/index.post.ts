import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { servicePackageInputSchema } from '~/lib/servicePackageSchemas'
import { rethrowIfMissingCollection } from '~/server/utils/pbMissingCollection'
import type { ProposalServicePackage } from '~/types'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)

  const raw = await readBody(event).catch(() => ({}))
  const parsed = servicePackageInputSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid package' })
  }
  const body = parsed.data
  const sku = body.sku.trim()
  const esc = crmOwnerId.replace(/"/g, '\\"')
  const skuEsc = sku.replace(/"/g, '\\"')

  const dup = await pb
    .collection('proposal_service_packages')
    .getFirstListItem(`user = "${esc}" && sku = "${skuEsc}"`)
    .catch(() => null)
  if (dup) throw createError({ statusCode: 409, message: 'A package with this SKU already exists' })

  try {
    const row = await pb.collection('proposal_service_packages').create({
      user: crmOwnerId,
      sku,
      name: body.name.trim(),
      description_html: body.description_html?.trim() || null,
      default_unit_price: body.default_unit_price,
      billing_interval: body.billing_interval,
      category: body.category || null,
      sort_order: body.sort_order ?? 0,
      active: body.active !== false,
      stripe_product_id: body.stripe_product_id?.trim() || null,
      stripe_price_id: body.stripe_price_id?.trim() || null,
    })
    return { package: row as ProposalServicePackage }
  } catch (e: unknown) {
    rethrowIfMissingCollection(e, 'proposal_service_packages')
  }
})