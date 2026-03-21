import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getWorkspaceContext } from '~/server/utils/workspace'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const ownerId = await getUserIdFromRequest(event)
  if (!ownerId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { clientId?: string; siteIds?: string[] }
  const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : ''
  const siteIds = Array.isArray(body.siteIds) ? body.siteIds.filter((x): x is string => typeof x === 'string') : []
  if (!clientId) throw createError({ statusCode: 400, message: 'Missing client id.' })

  const pb = getAdminPb()
  await adminAuth(pb)
  const ctx = await getWorkspaceContext(pb, ownerId)
  if (ctx.role !== 'owner') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const client = await pb.collection('users').getOne<{ agency_owner?: string; account_type?: string }>(clientId)
  const ao = typeof client.agency_owner === 'string' ? client.agency_owner : ''
  if (ao !== ownerId || client.account_type !== 'client') {
    throw createError({ statusCode: 403, message: 'Invalid client.' })
  }

  for (const sid of siteIds) {
    const site = await pb.collection('sites').getOne(sid).catch(() => null)
    if (!site || (site as { user?: string }).user !== ownerId) {
      throw createError({ statusCode: 400, message: 'Invalid site selection.' })
    }
  }

  const existing = await pb.collection('client_site_access').getFullList<{ id: string }>({
    filter: `client = "${clientId}"`,
    batch: 200,
  })
  for (const r of existing) {
    await pb.collection('client_site_access').delete(r.id)
  }
  for (const sid of siteIds) {
    await pb.collection('client_site_access').create({
      owner: ownerId,
      client: clientId,
      site: sid,
    })
  }

  return { ok: true }
})
