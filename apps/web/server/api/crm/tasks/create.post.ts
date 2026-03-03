import { getMethod } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

/** POST /api/crm/tasks/create — create a task (client required). */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const pb = getAdminPb()
  await adminAuth(pb)
  const body = (await readBody(event).catch(() => ({}))) as {
    client?: string
    title?: string
    due_at?: string
    priority?: 'low' | 'med' | 'high'
    status?: 'open' | 'done'
    notes?: string
  }
  const client = body?.client?.trim()
  const title = body?.title?.trim()
  let dueAt = body?.due_at?.trim()
  if (!client) throw createError({ statusCode: 400, message: 'Client is required' })
  if (!title) throw createError({ statusCode: 400, message: 'Title is required' })
  if (!dueAt) throw createError({ statusCode: 400, message: 'due_at is required' })
  // Normalize date: "YYYY-MM-DD" from input[type=date] -> full ISO for PocketBase
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueAt)) dueAt = `${dueAt}T12:00:00.000Z`
  const clientRecord = await pb.collection('crm_clients').getOne(client)
  if ((clientRecord as { user?: string }).user !== userId) throw createError({ statusCode: 403, message: 'Forbidden' })
  const priority = body?.priority && ['low', 'med', 'high'].includes(body.priority) ? body.priority : 'med'
  const status = body?.status && ['open', 'done'].includes(body.status) ? body.status : 'open'
  const record = await pb.collection('crm_tasks').create({
    user: userId,
    client,
    title,
    due_at: dueAt,
    priority,
    status,
    notes: body?.notes?.trim() || null,
  })
  return record
})

