import type { AutomatedReportScheduleRecord } from '~/types'

export function useReportSchedules() {
  const pb = usePocketbase()
  const schedules = ref<AutomatedReportScheduleRecord[]>([])
  const pending = ref(false)
  const error = ref('')

  function authHeaders(): Record<string, string> {
    const token = pb.authStore.token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function load(siteId?: string) {
    pending.value = true
    error.value = ''
    try {
      const q = siteId ? { siteId } : {}
      const res = await $fetch<{ schedules: AutomatedReportScheduleRecord[] }>('/api/reports/schedules/list', {
        headers: authHeaders(),
        query: q,
      })
      schedules.value = res.schedules ?? []
    } catch (e: unknown) {
      error.value = 'Could not load schedules.'
      schedules.value = []
    } finally {
      pending.value = false
    }
  }

  async function createSchedule(args: {
    reportId: string
    frequency: 'daily' | 'weekly' | 'monthly'
    startAtIso: string
    fromEmail?: string
    toEmail?: string
  }) {
    const { schedule } = await $fetch<{ schedule: AutomatedReportScheduleRecord }>('/api/reports/schedules/create', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        reportId: args.reportId,
        frequency: args.frequency,
        startAt: args.startAtIso,
        fromEmail: args.fromEmail,
        toEmail: args.toEmail,
      },
    })
    await load()
    return schedule
  }

  async function setActive(id: string, is_active: boolean) {
    await $fetch(`/api/reports/schedules/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: { is_active },
    })
    await load()
  }

  async function updateSchedule(args: {
    id: string
    reportId: string
    frequency: 'daily' | 'weekly' | 'monthly'
    startAtIso: string
    fromEmail?: string
    toEmail?: string
  }) {
    await $fetch(`/api/reports/schedules/${args.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: {
        reportId: args.reportId,
        frequency: args.frequency,
        startAt: args.startAtIso,
        fromEmail: args.fromEmail,
        toEmail: args.toEmail,
      },
    })
    await load()
  }

  async function remove(id: string) {
    await $fetch(`/api/reports/schedules/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    await load()
  }

  return { schedules, pending, error, load, createSchedule, updateSchedule, setActive, remove }
}
