import { getAdminPb, adminAuth, getUserIdFromRequest } from '~/server/utils/pbServer'

const defaultStats = {
  leadsCount: 0,
  clientsCount: 0,
  openDealsSum: 0,
  overdueTasksCount: 0,
  staleLeads: [] as { id: string; name?: string; company?: string }[],
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromRequest(event)
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  try {
    const pb = getAdminPb()
    await adminAuth(pb)

    const filterUser = 'user = "' + userId + '"'

    const [clients, sales, tasks] = await Promise.all([
      pb.collection('crm_clients').getFullList({ filter: filterUser }).catch(() => []),
      pb.collection('crm_sales').getFullList({ filter: filterUser + ' && status = "open"' }).catch(() => []),
      pb.collection('crm_tasks').getFullList({ filter: filterUser + ' && status = "open"' }).catch(() => []),
    ])

    const leadsCount = clients.filter((c: { status?: string }) => c.status === 'lead').length
    const clientsCount = clients.filter((c: { status?: string }) => c.status === 'client').length
    const openDealsSum = sales.reduce((sum: number, s: { amount?: number }) => sum + (Number(s.amount) || 0), 0)
    const now = new Date().toISOString().slice(0, 10)
    const overdueTasksCount = tasks.filter((t: { due_at?: string }) => (t.due_at || '') < now).length

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const staleLeads = clients.filter((c: { status?: string; last_activity_at?: string | null }) => {
      if (c.status !== 'lead') return false
      if (!c.last_activity_at) return true
      return new Date(c.last_activity_at) < sevenDaysAgo
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
