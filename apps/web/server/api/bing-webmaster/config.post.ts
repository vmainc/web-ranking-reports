import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'
import {
  getBingWebmasterIntegration,
  validateBingApiKey,
  type BingWebmasterIntegrationRecord,
} from '~/server/utils/bingWebmasterAccess'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { siteId?: string; api_key?: string }
  const siteId = body?.siteId
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId required' })

  const apiKey = typeof body.api_key === 'string' ? body.api_key.trim() : ''
  if (!apiKey) throw createError({ statusCode: 400, message: 'API key is required.' })

  const validation = await validateBingApiKey(apiKey)
  if (!validation.valid) {
    throw createError({
      statusCode: 400,
      message: validation.message ?? 'Invalid API key. Get your key from Bing Webmaster Tools → Settings → API Access.',
    })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  try {
    let integration = await getBingWebmasterIntegration(pb, siteId)
    if (!integration) {
      await pb.collection('integrations').create<BingWebmasterIntegrationRecord>({
        site: siteId,
        provider: 'bing_webmaster',
        status: 'connected',
        connected_at: new Date().toISOString(),
        config_json: { api_key: apiKey },
      })
      return { ok: true }
    }

    await pb.collection('integrations').update(integration.id, {
      status: 'connected',
      connected_at: new Date().toISOString(),
      config_json: { ...integration.config_json, api_key: apiKey },
    })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('provider') || msg.includes('validation') || msg.includes('Invalid') || /something went wrong|processing your request/i.test(msg)) {
      throw createError({
        statusCode: 400,
        message: 'Bing Webmaster integration is not enabled in the database. In PocketBase Admin (http://127.0.0.1:8090/_/) go to Collections → integrations → provider field, add the option "bing_webmaster", then try again.',
      })
    }
    throw createError({ statusCode: 500, message: msg })
  }
})
