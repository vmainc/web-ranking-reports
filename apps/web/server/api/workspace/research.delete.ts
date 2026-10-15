import { getQuery } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { deleteWorkspaceResearchItem } from '~/server/utils/prospectResearch'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const key = String(getQuery(event).key || '').trim()
  if (!key) throw createError({ statusCode: 400, message: 'Missing research key.' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await requireCrmOwnerId(pb, userId)
  const items = await deleteWorkspaceResearchItem(pb, ownerId, key)
  const sorted = [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  return { research: sorted[0] || null, researchItems: sorted }
})
