import { getMethod } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { cloudflareSetupError, isMissingCloudflareCollectionError } from '~/server/utils/cloudflareSetup'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const pb = getAdminPb()
  await adminAuth(pb)

  let rows: Array<{ id: string }> = []
  try {
    rows = await pb.collection('cloudflare_integrations').getFullList<{ id: string }>({
      filter: `user = "${userId}"`,
      sort: '-updated',
    })
  } catch (e) {
    if (isMissingCloudflareCollectionError(e)) throw cloudflareSetupError()
    throw e
  }
  const row = rows[0]
  if (row?.id) {
    try {
      await pb.collection('cloudflare_integrations').update(row.id, { connected: false })
    } catch (e) {
      if (isMissingCloudflareCollectionError(e)) throw cloudflareSetupError()
      throw e
    }
  }
  return { ok: true }
})

