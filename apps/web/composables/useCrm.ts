/**
 * CRM composables. Data via server API ($fetch) with auth.
 * usePb() = usePocketbase() (existing).
 */
import type { CrmClient, CrmSale, CrmContactPoint, CrmTask } from '~/types'

const CRM_API = '/api/crm'

function authHeaders(): Record<string, string> {
  const pb = usePocketbase()
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Alias for usePocketbase. */
export function usePb() {
  return usePocketbase()
}

export function useCrmClients() {
  const clients = ref<CrmClient[]>([])
  const pending = ref(false)
  const error = ref('')
  const pb = usePb()

  async function load(filters?: { status?: string; pipeline_stage?: string; search?: string }) {
    pending.value = true
    error.value = ''
    try {
      const authId = pb.authStore.model?.id as string | undefined
      if (!authId) {
        clients.value = []
        return
      }
      const parts: string[] = [`user = "${authId}"`]
      if (filters?.status) parts.push(`status = "${filters.status}"`)
      if (filters?.pipeline_stage) parts.push(`pipeline_stage = "${filters.pipeline_stage}"`)
      const filter = parts.join(' && ')
      const list = await pb.collection('crm_clients').getFullList<CrmClient>({
        filter: filter || undefined,
        sort: '-created',
      })
      let result = list
      if (filters?.search?.trim()) {
        const term = filters.search.trim().toLowerCase()
        result = list.filter(
          (c) =>
            c.name?.toLowerCase().includes(term) ||
            (c as { email?: string }).email?.toLowerCase().includes(term) ||
            (c as { company?: string }).company?.toLowerCase().includes(term)
        )
      }
      clients.value = result
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      error.value = err?.data?.message ?? err?.message ?? 'Failed to load clients'
      clients.value = []
    } finally {
      pending.value = false
    }
  }

  return { clients, pending, error, load }
}

/** Leads only, grouped by pipeline_stage for Kanban. When status becomes "client" they leave the pipeline. */
export function useCrmPipeline() {
  const { clients, pending, error, load } = useCrmClients()
  const stages = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const

  const byStage = computed(() => {
    const map: Record<string, CrmClient[]> = {}
    stages.forEach((s) => (map[s] = []))
    clients.value.forEach((c) => {
      const stage = (c.pipeline_stage || 'new') as (typeof stages)[number]
      if (!map[stage]) map[stage] = []
      map[stage].push(c)
    })
    return map
  })

  /** Load only leads (status=lead) so clients don't appear in the pipeline. */
  async function loadPipeline() {
    await load({ status: 'lead' })
  }

  async function moveClient(clientId: string, pipelineStage: string) {
    try {
      await usePb().collection('crm_clients').update(clientId, { pipeline_stage: pipelineStage })
      await loadPipeline()
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      throw new Error(err?.data?.message ?? err?.message ?? 'Failed to update')
    }
  }

  return { clients, byStage, stages, pending, error, load: loadPipeline, moveClient }
}

export function useCrmContactPoints(clientId: Ref<string> | string) {
  const id = typeof clientId === 'string' ? ref(clientId) : clientId
  const contactPoints = ref<(CrmContactPoint & { expand?: { client?: CrmClient } })[]>([])
  const pending = ref(false)
  const error = ref('')

  async function load() {
    if (!id.value) return
    pending.value = true
    error.value = ''
    try {
      const data = await $fetch<{ contactPoints: (CrmContactPoint & { expand?: { client?: CrmClient } })[] }>(
        `${CRM_API}/contact-points`,
        { headers: authHeaders(), query: { client: id.value } }
      )
      contactPoints.value = (data.contactPoints ?? []).sort(
        (a, b) => new Date(b.happened_at).getTime() - new Date(a.happened_at).getTime()
      )
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      error.value = err?.data?.message ?? err?.message ?? 'Failed to load activity'
      contactPoints.value = []
    } finally {
      pending.value = false
    }
  }

  return { contactPoints, pending, error, load }
}

export function useCrmSales(clientId?: Ref<string> | string) {
  const id = clientId ? (typeof clientId === 'string' ? ref(clientId) : clientId) : ref('')
  const sales = ref<(CrmSale & { expand?: { client?: CrmClient } })[]>([])
  const pending = ref(false)
  const error = ref('')

  async function load(statusFilter?: string) {
    pending.value = true
    error.value = ''
    try {
      const q: Record<string, string> = {}
      if (id.value) q.client = id.value
      if (statusFilter) q.status = statusFilter
      const data = await $fetch<{ sales: (CrmSale & { expand?: { client?: CrmClient } })[] }>(`${CRM_API}/sales`, {
        headers: authHeaders(),
        query: q,
      })
      sales.value = data.sales ?? []
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      error.value = err?.data?.message ?? err?.message ?? 'Failed to load sales'
      sales.value = []
    } finally {
      pending.value = false
    }
  }

  return { sales, pending, error, load }
}

export function useCrmTasks(clientId?: Ref<string> | string) {
  const id = clientId ? (typeof clientId === 'string' ? ref(clientId) : clientId) : ref('')
  const tasks = ref<(CrmTask & { expand?: { client?: CrmClient } })[]>([])
  const pending = ref(false)
  const error = ref('')
  const pb = usePb()

  async function load(statusFilter?: 'open' | 'done') {
    pending.value = true
    error.value = ''
    try {
      const authId = pb.authStore.model?.id as string | undefined
      if (!authId) {
        tasks.value = []
        throw new Error('Not authenticated')
      }
      const filters: string[] = [`user = "${authId}"`]
      if (id.value) filters.push(`client = "${id.value}"`)
      if (statusFilter) filters.push(`status = "${statusFilter}"`)
      const list = await pb.collection('crm_tasks').getFullList<CrmTask & { expand?: { client?: CrmClient } }>({
        filter: filters.join(' && '),
        sort: 'due_at',
        expand: 'client',
      })
      tasks.value = list
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      error.value = err?.data?.message ?? err?.message ?? 'Failed to load tasks'
      tasks.value = []
    } finally {
      pending.value = false
    }
  }

  return { tasks, pending, error, load }
}
