import { ClientResponseError } from 'pocketbase'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const q = getQuery(event)
  const pendingOnly = q.pending === '1' || q.pending === 'true'

  const pb = getAdminPb()
  await adminAuth(pb)

  const filter = `user = "${userId}"`

  let list: unknown[]
  try {
    list = await pb.collection('seoptimer_leads').getFullList({
      filter,
      sort: '-received_at',
      batch: 200,
      expand: 'crm_client',
    })
  } catch (e: unknown) {
    if (e instanceof ClientResponseError && (e.status === 404 || e.status === 400)) {
      throw createError({
        statusCode: 503,
        message:
          'SEOptimer storage is not available yet. On the server: pull latest code, restart the PocketBase container so migration 1776100000 runs, then refresh this page.',
      })
    }
    throw e
  }

  const leads = pendingOnly
    ? list.filter((row: { crm_client?: string | null }) => !(row as { crm_client?: string | null }).crm_client)
    : list

  return { leads }
})
