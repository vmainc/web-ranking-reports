import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getWorkspaceContext } from '~/server/utils/workspace'
import { transactionalSmtpEnvReady } from '~/server/utils/smtpSend'

/** Agency owners only: whether the web container can send invite/report mail (env SMTP). */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const ctx = await getWorkspaceContext(pb, userId)
  if (ctx.role !== 'owner') {
    return { applicable: false as const }
  }

  return {
    applicable: true as const,
    transactionalSmtpReady: transactionalSmtpEnvReady(),
  }
})
