import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const body = (await readBody(event).catch(() => ({}))) as {
    name?: string
    email?: string
    phone?: string
    company?: string
    status?: 'lead' | 'client' | 'archived'
    notes?: string
  }
  const name = body?.name?.trim() ?? ''
  if (!name) throw createError({ statusCode: 400, message: 'Name is required' })
  const status = body?.status && ['lead', 'client', 'archived'].includes(body.status) ? body.status : 'lead'
  const record = await pb.collection('crm_clients').create({
    user: userId,
    name,
    email: body?.email?.trim() || null,
    phone: body?.phone?.trim() || null,
    company: body?.company?.trim() || null,
    status,
    notes: body?.notes?.trim() || null,
  })
  return record
})
