import { getMethod } from 'h3'
import { adminAuth, getAdminPb, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)

  // Best-effort cleanup for client access rows directly tied to this user.
  const clientSiteAccessRows = await pb.collection('client_site_access').getFullList<{ id: string }>({
    filter: `client = "${userId}"`,
    batch: 200,
  }).catch(() => [])
  for (const row of clientSiteAccessRows) {
    await pb.collection('client_site_access').delete(row.id).catch(() => {})
  }

  await pb.collection('users').delete(userId)
  return { ok: true }
})
