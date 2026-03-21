import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getWorkspaceContext } from '~/server/utils/workspace'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const ownerId = await getUserIdFromRequest(event)
  if (!ownerId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { userId?: string }
  const targetId = typeof body.userId === 'string' ? body.userId.trim() : ''
  if (!targetId || targetId === ownerId) {
    throw createError({ statusCode: 400, message: 'Invalid user.' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  const ctx = await getWorkspaceContext(pb, ownerId)
  if (ctx.role !== 'owner') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const target = await pb.collection('users').getOne<{ agency_owner?: string; account_type?: string }>(targetId)
  const ao = typeof target.agency_owner === 'string' ? target.agency_owner : ''
  if (ao !== ownerId) {
    throw createError({ statusCode: 403, message: 'That user is not in your workspace.' })
  }

  const at = typeof target.account_type === 'string' ? target.account_type : ''
  if (at === 'client') {
    const rows = await pb.collection('client_site_access').getFullList<{ id: string }>({
      filter: `client = "${targetId}"`,
      batch: 200,
    })
    for (const r of rows) {
      await pb.collection('client_site_access').delete(r.id)
    }
  }

  await pb.collection('users').delete(targetId)
  return { ok: true }
})
