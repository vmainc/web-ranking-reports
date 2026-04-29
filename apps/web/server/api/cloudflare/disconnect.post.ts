import { getMethod } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)

  const rows = await pb.collection('cloudflare_integrations').getFullList<{ id: string }>({
    filter: `user = "${userId}"`,
    sort: '-updated',
  }).catch(() => [])
  const row = rows[0]
  if (row?.id) {
    await pb.collection('cloudflare_integrations').update(row.id, { connected: false })
  }
  return { ok: true }
})

