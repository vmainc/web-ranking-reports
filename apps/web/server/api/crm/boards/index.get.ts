import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { requireCrmOwnerId } from '~/server/utils/workspace'
import { ensureDefaultCrmBoard } from '~/server/utils/crmBoards'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)
  try {
    const boards = await ensureDefaultCrmBoard(pb, crmOwnerId)
    return { boards }
  } catch (e: unknown) {
    const msg = (e as { message?: string })?.message || String(e)
    if (/Missing collection|wasn't found|404/i.test(msg)) {
      throw createError({
        statusCode: 503,
        message: 'CRM boards are not set up yet. Run: node apps/web/scripts/add-crm-boards-collections.mjs',
      })
    }
    throw e
  }
})
