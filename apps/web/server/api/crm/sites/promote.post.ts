import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import {
  crmRowOwnedByUser,
  extractPocketBaseRelationId,
  getWorkspaceContext,
  requireCrmOwnerId,
} from '~/server/utils/workspace'
import { isProspectSite } from '~/server/utils/siteBilling'
import { promoteProspectSiteForOwner } from '~/server/utils/proposalAcceptance'

/** Promote a prospect site to an active reporting slot (consumes plan site limit). */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const ctx = await getWorkspaceContext(pb, userId)
  if (ctx.role === 'client') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const body = (await readBody(event).catch(() => ({}))) as {
    siteId?: string
    proposalId?: string
    clientId?: string
  }
  const siteId = body.siteId?.trim()
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId is required' })

  if (body.clientId?.trim()) {
    const client = await pb.collection('crm_clients').getOne(body.clientId.trim()).catch(() => null)
    if (!client || !crmRowOwnedByUser(client as { user?: unknown }, crmOwnerId)) {
      throw createError({ statusCode: 403, message: 'Client not found' })
    }
  }

  const site = await pb.collection('sites').getOne(siteId).catch(() => null)
  if (!site || extractPocketBaseRelationId((site as { user?: unknown }).user) !== crmOwnerId) {
    throw createError({ statusCode: 404, message: 'Site not found' })
  }
  if (!isProspectSite(site as Record<string, unknown>)) {
    throw createError({ statusCode: 400, message: 'Site is not a prospect site' })
  }

  const result = await promoteProspectSiteForOwner(pb, crmOwnerId, siteId, {
    proposalId: body.proposalId?.trim(),
    clientId: body.clientId?.trim(),
  })
  return { site: result.site }
})
