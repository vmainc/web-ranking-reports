import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getWorkspaceContext } from '~/server/utils/workspace'
import { assertPlanLimit } from '~/server/utils/planGuard'

/** Soft cap so prospect sites cannot grow without bound while excluded from max_sites. */
const MAX_PROSPECT_SITES = 20

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as {
    name?: string
    domain?: string
    lifecycle?: 'prospect' | 'active'
  }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const domain = typeof body.domain === 'string' ? body.domain.trim() : ''
  if (!name || !domain) {
    throw createError({ statusCode: 400, message: 'Name and domain are required.' })
  }
  const lifecycle = body.lifecycle === 'prospect' ? 'prospect' : 'active'

  const pb = getAdminPb()
  await adminAuth(pb)
  const ctx = await getWorkspaceContext(pb, userId)
  if (ctx.role === 'client') {
    throw createError({ statusCode: 403, message: 'Read-only users cannot add sites.' })
  }

  const ownerId = ctx.role === 'owner' ? userId : ctx.ownerId
  const esc = ownerId.replace(/"/g, '\\"')

  if (lifecycle === 'prospect') {
    const prospectCount = await pb
      .collection('sites')
      .getList(1, 1, { filter: `user = "${esc}" && lifecycle = "prospect"` })
      .then((r) => Number(r.totalItems || 0))
      .catch(() => 0)
    if (prospectCount >= MAX_PROSPECT_SITES) {
      throw createError({
        statusCode: 402,
        message: `Prospect site limit reached (${MAX_PROSPECT_SITES}). Promote or remove unused prospects.`,
        data: { code: 'PROSPECT_LIMIT_REACHED' },
      })
    }
  } else {
    await assertPlanLimit(pb, ownerId, 'sites', 1)
  }

  const payload: Record<string, unknown> = {
    user: ownerId,
    name,
    domain,
    lifecycle,
  }

  if (lifecycle === 'active') {
    const trialEnds = new Date()
    trialEnds.setUTCDate(trialEnds.getUTCDate() + 14)
    trialEnds.setUTCHours(23, 59, 59, 999)
    payload.billing_status = 'trial'
    payload.trial_ends_at = trialEnds.toISOString()
  }

  const site = await pb.collection('sites').create(payload)
  return { site }
})
