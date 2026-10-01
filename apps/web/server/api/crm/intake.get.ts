import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { crmRowOwnedByUser, requireCrmOwnerId } from '~/server/utils/workspace'
import { isMissingCollectionError } from '~/server/utils/pbMissingCollection'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const query = getQuery(event)
  const clientId = (query.clientId as string)?.trim()
  if (!clientId) throw createError({ statusCode: 400, message: 'clientId is required' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  const clientRecord = await pb.collection('crm_clients').getOne(clientId).catch(() => null)
  if (!clientRecord || !crmRowOwnedByUser(clientRecord as { user?: unknown }, crmOwnerId)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  try {
    const list = await pb.collection('crm_intake').getFullList({
      filter: `client = "${clientId}"`,
      sort: '-updated',
    })
    return list[0] ?? null
  } catch (e) {
    // No snapshot yet, or collection not bootstrapped — UI treats null as empty form.
    if (isMissingCollectionError(e)) return null
    throw e
  }
})
