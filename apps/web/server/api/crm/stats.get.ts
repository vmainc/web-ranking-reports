import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

const defaultStats = {
  leadsCount: 0,
  clientsCount: 0,
  openDealsSum: 0,
  overdueTasksCount: 0,
  staleLeads: [] as { id: string; name?: string; company?: string }[],
}

/** Cutoff: start of day UTC, 7 days ago. Leads with last activity before this are stale. */
function getSevenDaysAgoCutoff(): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 7)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/** Parse date string (ISO or YYYY-MM-DD); return null if invalid. */
function parseDate(s: string | null | undefined): Date | null {
  if (!s || typeof s !== 'string') return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  try {
    const pb = getAdminPb()
    await adminAuth(pb)

    const filterUser = 'user = "' + userId + '"'

    const [clients, sales, tasks, contactPoints] = await Promise.all([
      pb.collection('crm_clients').getFullList({ filter: filterUser }).catch(() => []),
      pb.collection('crm_sales').getFullList({ filter: filterUser + ' && status = "open"' }).catch(() => []),
      pb.collection('crm_tasks').getFullList({ filter: filterUser + ' && status = "open"' }).catch(() => []),
      pb.collection('crm_contact_points').getFullList({ filter: filterUser }).catch(() => []),
    ])

    const leadsCount = clients.filter((c: { status?: string }) => c.status === 'lead').length
    const clientsCount = clients.filter((c: { status?: string }) => c.status === 'client').length
    const openDealsSum = sales.reduce((sum: number, s: { amount?: number }) => sum + (Number(s.amount) || 0), 0)
    const now = new Date().toISOString().slice(0, 10)
    const overdueTasksCount = tasks.filter((t: { due_at?: string }) => (t.due_at || '') < now).length

    // Latest contact point per client (fallback when last_activity_at is missing)
    const lastActivityByClient: Record<string, string> = {}
    for (const cp of contactPoints as { client?: string; happened_at?: string }[]) {
      const cid = cp.client
      const at = cp.happened_at
      if (cid && at && (!lastActivityByClient[cid] || at > lastActivityByClient[cid])) {
        lastActivityByClient[cid] = at
      }
    }

    const sevenDaysAgo = getSevenDaysAgoCutoff()
    const staleLeads = clients.filter((c: { id?: string; status?: string; last_activity_at?: string | null }) => {
      if (c.status !== 'lead') return false
      const lastActivity = c.last_activity_at || lastActivityByClient[c.id ?? ''] || null
      if (!lastActivity) return true
      const parsed = parseDate(lastActivity)
      if (!parsed) return true
      return parsed < sevenDaysAgo
    })

    return {
      leadsCount,
      clientsCount,
      openDealsSum,
      overdueTasksCount,
      staleLeads,
    }
  } catch {
    return defaultStats
  }
})
