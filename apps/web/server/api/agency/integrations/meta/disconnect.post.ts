import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireWorkspaceOwner, getWorkspaceContext, escPbFilterId, extractPocketBaseRelationId } from '~/server/utils/workspace'
import {
  decryptIntegrationToken,
  getAgencyIntegration,
  upsertAgencyMetaIntegration,
} from '~/server/services/social/agencyMetaIntegration'
import { revokeMetaUserPermissions } from '~/server/utils/metaClient'
import { listSiteSocialConnections, updateSocialConnection } from '~/server/services/social/socialConnections'
import { assertRateLimit } from '~/server/utils/emailSendingRateLimit'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  assertRateLimit({
    key: `meta-oauth-disconnect:${userId}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  })

  const pb = getAdminPb()
  await adminAuth(pb)
  await requireWorkspaceOwner(pb, userId)
  const ctx = await getWorkspaceContext(pb, userId)

  const existing = await getAgencyIntegration(pb, ctx.ownerId, 'meta')
  if (existing?.encrypted_access_token) {
    try {
      await revokeMetaUserPermissions(decryptIntegrationToken(existing))
    } catch {
      // ignore
    }
  }

  const sites = await pb.collection('sites').getFullList<{ id: string }>({
    filter: `user = "${escPbFilterId(ctx.ownerId)}"`,
    fields: 'id',
  })
  for (const site of sites) {
    const conns = await listSiteSocialConnections(pb, site.id).catch(() => [])
    for (const conn of conns) {
      if (conn.provider !== 'meta' || conn.access_type !== 'authenticated') continue
      const integId = extractPocketBaseRelationId(conn.agency_integration)
      if (existing && integId && integId !== existing.id) continue
      await updateSocialConnection(pb, conn.id, {
        status: 'reconnect_required',
        encrypted_page_token: '',
        last_error: 'Meta needs to be reconnected to continue collecting Facebook Insights.',
      })
    }
  }

  await upsertAgencyMetaIntegration(pb, ctx.ownerId, {
    encrypted_access_token: '',
    token_expires_at: '',
    scopes: '',
    status: 'disconnected',
    last_error: '',
    display_name: '',
    updated_by: userId,
  })

  return { ok: true }
})
