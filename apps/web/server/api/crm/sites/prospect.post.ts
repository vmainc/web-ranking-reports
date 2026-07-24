import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { crmRowOwnedByUser, requireCrmOwnerId } from '~/server/utils/workspace'

const MAX_PROSPECT_SITES = 20

/** Create a prospect site and optionally link it to a CRM client. */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const crmOwnerId = await requireCrmOwnerId(pb, userId)

  const body = (await readBody(event).catch(() => ({}))) as {
    clientId?: string
    name?: string
    domain?: string
    linkToClient?: boolean
  }
  const clientId = body.clientId?.trim()
  if (!clientId) throw createError({ statusCode: 400, message: 'clientId is required' })

  const client = await pb.collection('crm_clients').getOne(clientId).catch(() => null)
  if (!client || !crmRowOwnedByUser(client as { user?: unknown }, crmOwnerId)) {
    throw createError({ statusCode: 403, message: 'Client not found' })
  }

  let domain = typeof body.domain === 'string' ? body.domain.trim() : ''
  if (!domain) {
    const intake = await pb
      .collection('crm_intake')
      .getFullList<{ website_url?: string }>({
        filter: `client = "${clientId.replace(/"/g, '\\"')}"`,
        batch: 1,
      })
      .catch(() => [])
    domain = (intake[0]?.website_url || '').trim()
  }
  domain = domain.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  if (!domain) {
    throw createError({
      statusCode: 400,
      message: 'Domain is required (or set website URL on Digital Snapshot).',
    })
  }

  const name =
    (typeof body.name === 'string' && body.name.trim()) ||
    (client as { company?: string; name?: string }).company ||
    (client as { name?: string }).name ||
    domain

  const esc = crmOwnerId.replace(/"/g, '\\"')
  const prospectCount = await pb
    .collection('sites')
    .getList(1, 1, { filter: `user = "${esc}" && lifecycle = "prospect"` })
    .then((r) => Number(r.totalItems || 0))
    .catch(() => 0)
  if (prospectCount >= MAX_PROSPECT_SITES) {
    throw createError({
      statusCode: 402,
      message: `Prospect site limit reached (${MAX_PROSPECT_SITES}).`,
      data: { code: 'PROSPECT_LIMIT_REACHED' },
    })
  }

  const site = await pb.collection('sites').create({
    user: crmOwnerId,
    name,
    domain,
    lifecycle: 'prospect',
  })

  if (body.linkToClient !== false) {
    await pb.collection('crm_clients').update(clientId, { site: site.id })
  }

  const freshClient = await pb.collection('crm_clients').getOne(clientId, { expand: 'site' })
  return { site, client: freshClient }
})
