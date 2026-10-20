import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { crmRowOwnedByUser, extractPocketBaseRelationId, requireCrmOwnerId } from '~/server/utils/workspace'
import { proposalCreateSchema } from '~/lib/proposalSchemas'
import {
  DEFAULT_ACCEPTANCE_OPTIONS,
  logProposalActivity,
  replaceProposalItems,
} from '~/server/utils/proposals'
import { buildInitialProposalContent, getProposalSettings } from '~/server/utils/proposalCatalog'
import { normalizeProposalContent, seedClientFromCrm } from '~/utils/proposalContent'
import { rethrowIfMissingCollection } from '~/server/utils/pbMissingCollection'

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

  const settings = await getProposalSettings(pb, crmOwnerId)
  let templateContent = null as ReturnType<typeof normalizeProposalContent> | null
  if (body.template_id?.trim()) {
    try {
      const tpl = await pb.collection('proposal_templates').getOne(body.template_id.trim())
      if (!crmRowOwnedByUser(tpl as { user?: unknown }, crmOwnerId)) {
        throw createError({ statusCode: 403, message: 'Template not found' })
      }
      templateContent = normalizeProposalContent((tpl as { content_json?: unknown }).content_json)
    } catch (e) {
      rethrowIfMissingCollection(e, 'proposal_templates')
      throw createError({ statusCode: 404, message: 'Template not found' })
    }
  }

  const clientSeed = seedClientFromCrm(client as Parameters<typeof seedClientFromCrm>[0])
  const content_json = body.content_json
    ? normalizeProposalContent(body.content_json)
    : buildInitialProposalContent({
        title: body.title,
        validUntil: body.valid_until,
        client: clientSeed,
        brand: settings.brand,
        templateContent,
      })

  const execSection = content_json.sections.find((s) => s.key === 'executive_summary')
  const termsSection = content_json.sections.find((s) => s.key === 'terms_assumptions')
  const intro_html = body.intro_html ?? execSection?.body ?? null
  const terms_html = body.terms_html ?? termsSection?.body ?? null
  const valid_until =
    body.valid_until || content_json.client.expiration_date || null

  let proposal
  try {
    proposal = await pb.collection('proposals').create({
      user: crmOwnerId,
      client: body.client,
      sale: saleId,
      site: siteId || null,
      version,
      status: 'draft',
      title: body.title,
      intro_html,
      terms_html,
      content_json,
      currency: (body.currency || 'USD').toUpperCase(),
      subtotal: 0,
      total: 0,
      valid_until,
      acceptance_options_json: DEFAULT_ACCEPTANCE_OPTIONS,
    })
  } catch (e) {
    rethrowIfMissingCollection(e, 'proposals')
    throw e
  }

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
