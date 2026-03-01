import { getRouterParam } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, message: 'Site id required' })
  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)
  const body = (await readBody(event).catch(() => ({}))) as { name?: string; status?: string; fields_json?: unknown[]; conditional_json?: unknown[]; settings_json?: Record<string, unknown> }
  try {
    const record = await pb.collection('lead_forms').create({
      site: siteId,
      name: typeof body?.name === 'string' ? body.name.trim() : 'Untitled form',
      status: body?.status === 'published' ? 'published' : 'draft',
      fields_json: Array.isArray(body?.fields_json) ? body.fields_json : [],
      conditional_json: Array.isArray(body?.conditional_json) ? body.conditional_json : [],
      settings_json: body?.settings_json ?? {},
    })
    return record
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string }
    if (err?.status === 404 || (err?.message && /requested resource wasn't found|collection.*not found/i.test(String(err.message)))) {
      throw createError({
        statusCode: 503,
        message: 'Lead Generation is not set up. Create the PocketBase collections by running: cd apps/web && node scripts/create-collections.mjs (with PocketBase running and PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD set).',
      })
    }
    throw e
  }
})
