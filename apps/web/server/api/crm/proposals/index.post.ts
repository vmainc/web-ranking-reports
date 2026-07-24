import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { crmRowOwnedByUser, extractPocketBaseRelationId, requireCrmOwnerId } from '~/server/utils/workspace'
import { proposalCreateSchema } from '~/lib/proposalSchemas'
import {
  DEFAULT_ACCEPTANCE_OPTIONS,
  logProposalActivity,
  replaceProposalItems,
} from '~/server/utils/proposals'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)

  const raw = await readBody(event).catch(() => ({}))
  const parsed = proposalCreateSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid proposal' })
  }
  const body = parsed.data

  const client = await pb.collection('crm_clients').getOne(body.client).catch(() => null)
  if (!client || !crmRowOwnedByUser(client as { user?: unknown }, crmOwnerId)) {
    throw createError({ statusCode: 403, message: 'Client not found' })
  }

  let saleId = body.sale?.trim() || ''
  if (saleId) {
    const sale = await pb.collection('crm_sales').getOne(saleId).catch(() => null)
    if (!sale || !crmRowOwnedByUser(sale as { user?: unknown }, crmOwnerId)) {
      throw createError({ statusCode: 403, message: 'Deal not found' })
    }
    const saleClient = extractPocketBaseRelationId((sale as { client?: unknown }).client)
    if (saleClient !== body.client) {
      throw createError({ statusCode: 400, message: 'Deal does not belong to this client' })
    }
  } else {
    const sale = await pb.collection('crm_sales').create({
      user: crmOwnerId,
      client: body.client,
      title: body.title,
      status: 'open',
      amount: null,
    })
    saleId = sale.id
  }

  let siteId = body.site?.trim() || extractPocketBaseRelationId((client as { site?: unknown }).site) || ''
  if (siteId) {
    const site = await pb.collection('sites').getOne(siteId).catch(() => null)
    const siteUser = site ? extractPocketBaseRelationId((site as { user?: unknown }).user) : ''
    if (!site || siteUser !== crmOwnerId) {
      throw createError({ statusCode: 403, message: 'Site not found' })
    }
  }

  const existingVersions = await pb.collection('proposals').getFullList({
    filter: `sale = "${saleId.replace(/"/g, '\\"')}"`,
    fields: 'version',
    sort: '-version',
  })
  const version = existingVersions.length ? Number((existingVersions[0] as { version?: number }).version || 0) + 1 : 1

  const proposal = await pb.collection('proposals').create({
    user: crmOwnerId,
    client: body.client,
    sale: saleId,
    site: siteId || null,
    version,
    status: 'draft',
    title: body.title,
    intro_html: body.intro_html || null,
    terms_html: body.terms_html || null,
    currency: (body.currency || 'USD').toUpperCase(),
    subtotal: 0,
    total: 0,
    valid_until: body.valid_until || null,
    acceptance_options_json: DEFAULT_ACCEPTANCE_OPTIONS,
  })

  if (body.items?.length) {
    await replaceProposalItems(pb, crmOwnerId, proposal.id, body.items)
  }

  await logProposalActivity(
    pb,
    crmOwnerId,
    body.client,
    'proposal_created',
    `Proposal created: ${body.title} (v${version})`,
  )

  const fresh = await pb.collection('proposals').getOne(proposal.id, { expand: 'client,sale,site' })
  const items = await pb.collection('proposal_items').getFullList({
    filter: `proposal = "${proposal.id}"`,
    sort: 'sort_order',
  })
  return { proposal: fresh, items }
})
