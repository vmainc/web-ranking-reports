import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)

  const list = await pb.collection('cloudflare_integrations').getFullList<{
    id: string
    connected?: boolean
    account_id?: string
    updated?: string
  }>({
    filter: `user = "${userId}"`,
    sort: '-updated',
  }).catch(() => [])

  const row = list[0]
  return {
    connected: !!row?.connected,
    accountId: row?.account_id ?? null,
    updatedAt: row?.updated ?? null,
  }
})

