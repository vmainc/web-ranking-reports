import { getQuery } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { deleteCompetitiveSnapshot } from '~/server/utils/competitiveSnapshot'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const key = String(getQuery(event).key || '').trim()
  if (!key) throw createError({ statusCode: 400, message: 'Missing snapshot key.' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await requireCrmOwnerId(pb, userId)
  const snapshots = await deleteCompetitiveSnapshot(pb, ownerId, key)
  const sorted = [...snapshots].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  return { snapshots: sorted }
})
