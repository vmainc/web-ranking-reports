import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { proposalTemplateCreateSchema } from '~/lib/proposalSchemas'
import { defaultProposalContent, normalizeProposalContent } from '~/utils/proposalContent'
import { getProposalSettings } from '~/server/utils/proposalCatalog'
import { rethrowIfMissingCollection } from '~/server/utils/pbMissingCollection'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)

  const raw = await readBody(event).catch(() => ({}))
  const parsed = proposalTemplateCreateSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid template' })
  }
  const body = parsed.data
  const settings = await getProposalSettings(pb, crmOwnerId)
  const content_json = body.content_json
    ? normalizeProposalContent(body.content_json)
    : defaultProposalContent({ brand: settings.brand })

  if (body.is_default) {
    const esc = crmOwnerId.replace(/"/g, '\\"')
    const existing = await pb.collection('proposal_templates').getFullList({ filter: `user = "${esc}"` }).catch(() => [])
    for (const row of existing) {
      await pb.collection('proposal_templates').update((row as { id: string }).id, { is_default: false })
    }
  }

  try {
    const template = await pb.collection('proposal_templates').create({
      user: crmOwnerId,
      name: body.name,
      description: body.description || null,
      content_json,
      is_default: body.is_default === true,
      sort_order: 0,
    })
    return { template }
  } catch (e) {
    rethrowIfMissingCollection(e, 'proposal_templates')
    throw e
  }
})
