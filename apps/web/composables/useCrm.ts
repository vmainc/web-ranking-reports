/**
 * CRM composables. Data via server API ($fetch) with auth.
 * usePb() = usePocketbase() (existing).
 */
import { onScopeDispose, watch } from 'vue'
import type { CrmClient, CrmSale, CrmContactPoint, CrmTask, SiteRecord } from '~/types'

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
  const lastFilters = ref<{ status?: string; pipeline_stage?: string; search?: string } | undefined>(undefined)

  async function load(filters?: { status?: string; pipeline_stage?: string; search?: string }) {
    lastFilters.value = filters
    pending.value = true
    error.value = ''
    try {
      if (!pb.authStore.token) {
        clients.value = []
        return
      }
      const q: Record<string, string> = {}
      if (filters?.status) q.status = filters.status
      if (filters?.pipeline_stage) q.pipeline_stage = filters.pipeline_stage
      if (filters?.search?.trim()) q.search = filters.search.trim()
      const data = await $fetch<{ clients: CrmClient[] }>(`${CRM_API}/clients`, {
        headers: authHeaders(),
        query: q,
      })
      clients.value = data.clients ?? []
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      error.value = err?.data?.message ?? err?.message ?? 'Failed to load clients'
      clients.value = []
    } finally {
      pending.value = false
    }
  }

  if (import.meta.client) {
    const stop = watch(
      () => pb.authStore.token,
      (t) => {
        if (t && pb.authStore.isValid) void load(lastFilters.value)
      },
    )
    onScopeDispose(() => stop())
  }

  return { clients, pending, error, load }
}

export type CrmPipelineStageDef = {
  id: string
  key: string
  label: string
  sortOrder: number
  isDefault: boolean
}

/** Leads only, grouped by pipeline_stage for Kanban. When status becomes "client" they leave the pipeline. */
export function useCrmPipeline() {
  const { clients, pending, error, load } = useCrmClients()
  const stageDefs = ref<CrmPipelineStageDef[]>([])
  const stagesPending = ref(false)
  const stagesError = ref('')

  const stages = computed(() => stageDefs.value.map((s) => s.key))
  const labelMap = computed(() =>
    Object.fromEntries(stageDefs.value.map((s) => [s.key, s.label])) as Record<string, string>,
  )

  const byStage = computed(() => {
    const map: Record<string, CrmClient[]> = {}
    for (const s of stageDefs.value) map[s.key] = []
    const fallback = stageDefs.value[0]?.key || 'new'
    clients.value.forEach((c) => {
      const stage = (c.pipeline_stage || fallback) as string
      if (!map[stage]) map[stage] = []
      map[stage].push(c)
    })
    return map
  })

  /** Includes unknown keys still used by leads so cards are not hidden. */
  const displayStageDefs = computed(() => {
    const list = [...stageDefs.value]
    const known = new Set(list.map((s) => s.key))
    for (const [key, items] of Object.entries(byStage.value)) {
      if (!known.has(key) && items.length) {
        list.push({
          id: '',
          key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          sortOrder: 9999,
          isDefault: false,
        })
      }
    }
    return list
  })

  async function loadStages() {
    stagesPending.value = true
    stagesError.value = ''
    try {
      const data = await $fetch<{ stages: CrmPipelineStageDef[] }>(`${CRM_API}/pipeline-stages`, {
        headers: authHeaders(),
      })
      stageDefs.value = data.stages ?? []
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      stagesError.value = err?.data?.message ?? err?.message ?? 'Failed to load Sales columns'
      stageDefs.value = []
    } finally {
      stagesPending.value = false
    }
  }

  /** Load only leads (status=lead) so clients don't appear in the pipeline. */
  async function loadPipeline() {
    await Promise.all([load({ status: 'lead' }), loadStages()])
  }

  async function moveClient(clientId: string, pipelineStage: string) {
    try {
      await $fetch(`${CRM_API}/clients/${clientId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: { pipeline_stage: pipelineStage },
      })
      await load({ status: 'lead' })
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      throw new Error(err?.data?.message ?? err?.message ?? 'Failed to update')
    }
  }

  async function renameStage(stageId: string, label: string) {
    const data = await $fetch<{ stages: CrmPipelineStageDef[] }>(`${CRM_API}/pipeline-stages/${stageId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: { label },
    })
    stageDefs.value = data.stages ?? []
  }

  async function addStage(label: string) {
    const data = await $fetch<{ stages: CrmPipelineStageDef[] }>(`${CRM_API}/pipeline-stages`, {
      method: 'POST',
      headers: authHeaders(),
      body: { label },
    })
    stageDefs.value = data.stages ?? []
  }

  async function deleteStage(stageId: string) {
    const data = await $fetch<{ stages: CrmPipelineStageDef[] }>(`${CRM_API}/pipeline-stages/${stageId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    stageDefs.value = data.stages ?? []
    await load({ status: 'lead' })
  }

  const combinedPending = computed(() => pending.value || stagesPending.value)

  return {
    clients,
    byStage,
    stages,
    stageDefs,
    displayStageDefs,
    labelMap,
    pending: combinedPending,
    error,
    stagesError,
    load: loadPipeline,
    loadStages,
    moveClient,
    renameStage,
    addStage,
    deleteStage,
  }
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
  const tasks = ref<(CrmTask & { expand?: { client?: CrmClient; site?: SiteRecord } })[]>([])
  const pending = ref(false)
  const error = ref('')
  const pb = usePb()

  async function load(statusFilter?: 'open' | 'done') {
    pending.value = true
    error.value = ''
    try {
      if (!pb.authStore.token) {
        tasks.value = []
        return
      }
      const q: Record<string, string> = {}
      if (id.value) q.client = id.value
      if (statusFilter) q.status = statusFilter
      const data = await $fetch<{ tasks: (CrmTask & { expand?: { client?: CrmClient; site?: SiteRecord } })[] }>(
        `${CRM_API}/tasks`,
        { headers: authHeaders(), query: q },
      )
      tasks.value = data.tasks ?? []
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

export function useCrmProposals(clientId?: Ref<string> | string) {
  const id = clientId ? (typeof clientId === 'string' ? ref(clientId) : clientId) : ref('')
  const proposals = ref<
    (import('~/types').Proposal & {
      expand?: { client?: CrmClient; sale?: CrmSale; site?: SiteRecord }
    })[]
  >([])
  const pending = ref(false)
  const error = ref('')

  async function load(statusFilter?: string) {
    pending.value = true
    error.value = ''
    try {
      const q: Record<string, string> = {}
      if (id.value) q.client = id.value
      if (statusFilter) q.status = statusFilter
      const data = await $fetch<{
        proposals: (import('~/types').Proposal & {
          expand?: { client?: CrmClient; sale?: CrmSale; site?: SiteRecord }
        })[]
      }>(`${CRM_API}/proposals`, {
        headers: authHeaders(),
        query: q,
      })
      proposals.value = data.proposals ?? []
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      error.value = err?.data?.message ?? err?.message ?? 'Failed to load proposals'
      proposals.value = []
    } finally {
      pending.value = false
    }
  }

  return { proposals, pending, error, load }
}

export function useCrmBoards() {
  const boards = ref<import('~/types').CrmBoard[]>([])
  const activeBoardId = ref('')
  const board = ref<import('~/types').CrmBoard | null>(null)
  const lists = ref<import('~/types').CrmBoardList[]>([])
  const pending = ref(false)
  const error = ref('')

  async function loadBoards() {
    pending.value = true
    error.value = ''
    try {
      const data = await $fetch<{ boards: import('~/types').CrmBoard[] }>(`${CRM_API}/boards`, {
        headers: authHeaders(),
      })
      boards.value = data.boards ?? []
      if (!activeBoardId.value || !boards.value.some((b) => b.id === activeBoardId.value)) {
        const preferred = boards.value.find((b) => b.is_default) || boards.value[0]
        activeBoardId.value = preferred?.id || ''
      }
      if (activeBoardId.value) await loadBoard(activeBoardId.value)
      else {
        board.value = null
        lists.value = []
      }
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      error.value = err?.data?.message ?? err?.message ?? 'Failed to load boards'
      boards.value = []
      board.value = null
      lists.value = []
    } finally {
      pending.value = false
    }
  }

  async function loadBoard(boardId: string) {
    const data = await $fetch<{
      board: import('~/types').CrmBoard
      lists: import('~/types').CrmBoardList[]
    }>(`${CRM_API}/boards/${boardId}`, { headers: authHeaders() })
    activeBoardId.value = boardId
    board.value = data.board
    lists.value = data.lists ?? []
  }

  async function createBoard(name: string) {
    const data = await $fetch<{ board: import('~/types').CrmBoard }>(`${CRM_API}/boards`, {
      method: 'POST',
      headers: authHeaders(),
      body: { name },
    })
    await loadBoards()
    if (data.board?.id) await loadBoard(data.board.id)
    return data.board
  }

  async function renameBoard(boardId: string, name: string) {
    await $fetch(`${CRM_API}/boards/${boardId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: { name },
    })
    await loadBoards()
  }

  async function deleteBoard(boardId: string) {
    await $fetch(`${CRM_API}/boards/${boardId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (activeBoardId.value === boardId) activeBoardId.value = ''
    await loadBoards()
  }

  async function addList(name: string) {
    if (!activeBoardId.value) return
    await $fetch(`${CRM_API}/boards/${activeBoardId.value}/lists`, {
      method: 'POST',
      headers: authHeaders(),
      body: { name },
    })
    await loadBoard(activeBoardId.value)
  }

  async function renameList(listId: string, name: string) {
    await $fetch(`${CRM_API}/board-lists/${listId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: { name },
    })
    if (activeBoardId.value) await loadBoard(activeBoardId.value)
  }

  async function deleteList(listId: string) {
    await $fetch(`${CRM_API}/board-lists/${listId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (activeBoardId.value) await loadBoard(activeBoardId.value)
  }

  async function addCard(listId: string, payload: { title: string; create_contact?: boolean; description?: string }) {
    await $fetch(`${CRM_API}/board-lists/${listId}/cards`, {
      method: 'POST',
      headers: authHeaders(),
      body: payload,
    })
    if (activeBoardId.value) await loadBoard(activeBoardId.value)
  }

  async function moveCard(cardId: string, listId: string) {
    await $fetch(`${CRM_API}/board-cards/${cardId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: { list: listId },
    })
    if (activeBoardId.value) await loadBoard(activeBoardId.value)
  }

  async function updateCard(cardId: string, body: { title?: string; description?: string | null }) {
    await $fetch(`${CRM_API}/board-cards/${cardId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body,
    })
    if (activeBoardId.value) await loadBoard(activeBoardId.value)
  }

  async function deleteCard(cardId: string) {
    await $fetch(`${CRM_API}/board-cards/${cardId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (activeBoardId.value) await loadBoard(activeBoardId.value)
  }

  return {
    boards,
    activeBoardId,
    board,
    lists,
    pending,
    error,
    loadBoards,
    loadBoard,
    createBoard,
    renameBoard,
    deleteBoard,
    addList,
    renameList,
    deleteList,
    addCard,
    moveCard,
    updateCard,
    deleteCard,
  }
}
