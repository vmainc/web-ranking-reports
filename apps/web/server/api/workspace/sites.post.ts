import { readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'
import { getWorkspaceContext } from '~/server/utils/workspace'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as { name?: string; domain?: string }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const domain = typeof body.domain === 'string' ? body.domain.trim() : ''
  if (!name || !domain) {
    throw createError({ statusCode: 400, message: 'Name and domain are required.' })
  }

  const pb = getAdminPb()
  await adminAuth(pb)
  const ctx = await getWorkspaceContext(pb, userId)
  if (ctx.role === 'client') {
    throw createError({ statusCode: 403, message: 'Read-only users cannot add sites.' })
  }

  const ownerId = ctx.role === 'owner' ? userId : ctx.ownerId
  const site = await pb.collection('sites').create({
    user: ownerId,
    name,
    domain,
  })
  return { site }
})
