import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import {
  runProspectDomainResearch,
  upsertWorkspaceResearchItem,
} from '~/server/utils/prospectResearch'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as {
    targetDomain?: string
    limit?: number
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  const ownerId = await requireCrmOwnerId(pb, userId)

  const research = await runProspectDomainResearch(pb, {
    targetDomain: body.targetDomain || '',
    limit: body.limit,
  })
  const researchItems = await upsertWorkspaceResearchItem(pb, ownerId, research)
  const sorted = [...researchItems].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  return { research, researchItems: sorted }
})
