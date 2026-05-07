import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { validateToken } from '~/server/services/cloudflare'
import { cloudflareSetupError, isMissingCloudflareCollectionError } from '~/server/utils/cloudflareSetup'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { apiToken?: string }
  const apiToken = typeof body?.apiToken === 'string' ? body.apiToken.trim() : ''
  if (!apiToken) throw createError({ statusCode: 400, message: 'Cloudflare API token is required.' })

  const v = await validateToken(apiToken)
  if (!v.valid) {
    throw createError({ statusCode: 400, message: v.message || 'Invalid Cloudflare token.' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)

  let existing: { id: string }[] = []
  try {
    existing = await pb.collection('cloudflare_integrations').getFullList<{ id: string }>({
      filter: `user = "${userId}"`,
      sort: '-updated',
    })
  } catch (e) {
    if (isMissingCloudflareCollectionError(e)) throw cloudflareSetupError()
    throw e
  }
  const row = existing[0]

  const payload = {
    user: userId,
    api_token: apiToken,
    account_id: v.accountId || '',
    connected: true,
  }

  if (row?.id) {
    try {
      await pb.collection('cloudflare_integrations').update(row.id, payload)
    } catch (e) {
      if (isMissingCloudflareCollectionError(e)) throw cloudflareSetupError()
      throw e
    }
  } else {
    try {
      await pb.collection('cloudflare_integrations').create(payload)
    } catch (e) {
      if (isMissingCloudflareCollectionError(e)) throw cloudflareSetupError()
      throw e
    }
  }

  return { ok: true, connected: true }
})

