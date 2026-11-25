import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { proposalTemplatePatchSchema } from '~/lib/servicePackageSchemas'
import { getProposalTemplate, saveProposalTemplate } from '~/server/utils/proposalServicePackages'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PATCH') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)

  const raw = await readBody(event).catch(() => ({}))
  const parsed = proposalTemplatePatchSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid template' })
  }

  const current = await getProposalTemplate(pb, crmOwnerId)
  const next = {
    intro_html: parsed.data.intro_html !== undefined ? parsed.data.intro_html : current.intro_html,
    terms_html: parsed.data.terms_html !== undefined ? parsed.data.terms_html : current.terms_html,
    currency: parsed.data.currency !== undefined ? parsed.data.currency : current.currency,
  }
  const template = await saveProposalTemplate(pb, crmOwnerId, next)
  return { template }
})