import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { extractPocketBaseRelationId, requireCrmOwnerId } from '~/server/utils/workspace'
import { proposalPatchSchema } from '~/lib/proposalSchemas'
import {
  assertProposalOwned,
  EDITABLE_PROPOSAL_STATUSES,
  listProposalItems,
  replaceProposalItems,
} from '~/server/utils/proposals'
import { normalizeProposalContent } from '~/utils/proposalContent'
import { rethrowIfMissingCollection } from '~/server/utils/pbMissingCollection'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const existing = await assertProposalOwned(pb, id, crmOwnerId)
  const status = String((existing as { status?: string }).status || '')
  const isDraft = EDITABLE_PROPOSAL_STATUSES.includes(status as 'draft')
  const canEditOptions = ['draft', 'sent', 'viewed'].includes(status)

  const raw = await readBody(event).catch(() => ({}))
  const parsed = proposalPatchSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid patch' })
  }
  const body = parsed.data
  const updates: Record<string, unknown> = {}

  const contentKeys = ['title', 'intro_html', 'terms_html', 'content_json', 'currency', 'valid_until', 'site'] as const
  const wantsContentEdit = contentKeys.some((k) => body[k] !== undefined)
  if (wantsContentEdit && !isDraft) {
    throw createError({ statusCode: 400, message: 'Only draft proposals can edit content' })
  }
  if (!isDraft && !canEditOptions) {
    throw createError({ statusCode: 400, message: 'Proposal cannot be edited' })
  }
  if (!isDraft && body.acceptance_options_json === undefined) {
    throw createError({ statusCode: 400, message: 'Only acceptance options can be updated after send' })
  }

  if (isDraft) {
    if (body.title !== undefined) updates.title = body.title
    if (body.intro_html !== undefined) updates.intro_html = body.intro_html
    if (body.terms_html !== undefined) updates.terms_html = body.terms_html
    if (body.currency !== undefined) updates.currency = body.currency.toUpperCase()
    if (body.valid_until !== undefined) updates.valid_until = body.valid_until
    if (body.content_json !== undefined) {
      const content = normalizeProposalContent(body.content_json)
      updates.content_json = content
      if (content.client.expiration_date && body.valid_until === undefined) {
        updates.valid_until = content.client.expiration_date
      }
      const exec = content.sections.find((s) => s.key === 'executive_summary')
      const terms = content.sections.find((s) => s.key === 'terms_assumptions')
      if (body.intro_html === undefined && exec) updates.intro_html = exec.body || null
      if (body.terms_html === undefined && terms) updates.terms_html = terms.body || null
    }
    if (body.site !== undefined) {
      if (body.site) {
        const site = await pb.collection('sites').getOne(body.site).catch(() => null)
        const siteUser = site ? extractPocketBaseRelationId((site as { user?: unknown }).user) : ''
        if (!site || siteUser !== crmOwnerId) {
          throw createError({ statusCode: 403, message: 'Site not found' })
        }
        updates.site = body.site
      } else {
        updates.site = null
      }
    }
  }

  if (body.acceptance_options_json !== undefined && canEditOptions) {
    updates.acceptance_options_json = body.acceptance_options_json
  }

  if (!Object.keys(updates).length) {
    throw createError({ statusCode: 400, message: 'No valid updates' })
  }

  let proposal
  try {
    proposal = await pb.collection('proposals').update(id, updates)
  } catch (e) {
    rethrowIfMissingCollection(e, 'proposals')
    throw e
  }

  if (isDraft && body.content_json !== undefined) {
    const items = await listProposalItems(pb, id)
    if (items.length) {
      await replaceProposalItems(
        pb,
        crmOwnerId,
        id,
        items.map((it) => ({
          source: it.source,
          product: it.product,
          external_product_id: it.external_product_id,
          sku: it.sku,
          name: it.name,
          description: it.description,
          qty: it.qty,
          unit_price: it.unit_price,
          billing_interval: it.billing_interval,
          metadata_json: it.metadata_json,
        })),
      )
      proposal = await pb.collection('proposals').getOne(id)
    }
  }

  return { proposal }
})
