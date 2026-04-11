import { getMethod, readBody } from 'h3'
import { getAdminPb, adminAuth, getUserIdFromRequest, assertSiteOwnership } from '~/server/utils/pbServer'

type TaskItem = { title: string; dueInDays?: number }

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') throw createError({ statusCode: 405, message: 'Method Not Allowed' })

  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event).catch(() => ({}))) as {
    siteId?: string
    tasks?: TaskItem[]
  }

  const siteId = (body.siteId ?? '').trim()
  if (!siteId) throw createError({ statusCode: 400, message: 'siteId is required' })

  const tasks = Array.isArray(body.tasks) ? body.tasks : []
  if (!tasks.length) throw createError({ statusCode: 400, message: 'tasks array is required' })
  if (tasks.length > 40) throw createError({ statusCode: 400, message: 'Too many tasks (max 40)' })

  const pb = getAdminPb()
  await adminAuth(pb)
  await assertSiteOwnership(pb, siteId, userId)

  const now = new Date()
  let created = 0

  for (const t of tasks) {
    const title = typeof t.title === 'string' ? t.title.trim().slice(0, 500) : ''
    if (!title) continue
    const days = typeof t.dueInDays === 'number' && Number.isFinite(t.dueInDays) ? Math.max(0, Math.min(365, Math.floor(t.dueInDays))) : 0
    const due = new Date(now)
    due.setUTCDate(due.getUTCDate() + days)
    due.setUTCHours(12, 0, 0, 0)

    await pb.collection('todo_tasks').create({
      user: userId,
      site: siteId,
      title,
      due_at: due.toISOString(),
      priority: 'med',
      status: 'open',
    })
    created += 1
  }

  return { created }
})
