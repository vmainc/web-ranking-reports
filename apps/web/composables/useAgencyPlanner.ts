import type { AgencyPlannerFormInput, AgencyPlannerPlan, Site } from '~/types'

export function executionPlanToTodoTasks(plan: AgencyPlannerPlan, includeQuickWins: boolean): Array<{ title: string; dueInDays: number }> {
  const out: Array<{ title: string; dueInDays: number }> = []
  const keys = ['week1', 'week2', 'week3', 'week4'] as const
  keys.forEach((wk, i) => {
    const steps = plan.execution_plan[wk] ?? []
    for (const step of steps) {
      const t = step.trim()
      if (t) out.push({ title: `Week ${i + 1}: ${t}`, dueInDays: i * 7 })
    }
  })
  if (includeQuickWins) {
    for (const w of plan.quick_wins) {
      const t = w.trim()
      if (t) out.push({ title: `Quick win: ${t}`, dueInDays: 0 })
    }
  }
  return out
}

const defaultForm = (): AgencyPlannerFormInput => ({
  agencyType: 'full_service',
  monthlyRevenue: '',
  clientCount: 5,
  primaryGoal: 'more_clients',
  notes: '',
})

export function useAgencyPlanner() {
  const pb = usePocketbase()
  const form = reactive<AgencyPlannerFormInput>(defaultForm())
  const plan = ref<AgencyPlannerPlan | null>(null)
  const rawResponse = ref<string | null>(null)
  const generating = ref(false)
  const saving = ref(false)
  const addingTodos = ref(false)
  const error = ref('')
  const saveMessage = ref('')
  const sites = ref<Site[]>([])
  const selectedSiteId = ref('')

  function authHeaders(): Record<string, string> {
    const token = pb.authStore.token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  function bodyFromForm(): Record<string, unknown> {
    return {
      agencyType: form.agencyType,
      monthlyRevenue: form.monthlyRevenue.trim() || undefined,
      clientCount: form.clientCount,
      primaryGoal: form.primaryGoal,
      notes: form.notes.trim() || undefined,
    }
  }

  async function loadSites() {
    try {
      const data = await $fetch<{ sites: Site[] }>('/api/workspace/sites', { headers: authHeaders() })
      sites.value = data.sites ?? []
      if (!selectedSiteId.value && sites.value.length === 1) {
        selectedSiteId.value = sites.value[0].id
      }
    } catch {
      sites.value = []
    }
  }

  async function generate() {
    error.value = ''
    saveMessage.value = ''
    generating.value = true
    rawResponse.value = null
    try {
      const res = await $fetch<{
        input: AgencyPlannerFormInput
        plan: AgencyPlannerPlan
        raw_response?: string
        raw_claude?: string
      }>('/api/agency/generate', {
        method: 'POST',
        headers: authHeaders(),
        body: bodyFromForm(),
      })
      Object.assign(form, {
        agencyType: res.input.agencyType,
        monthlyRevenue: res.input.monthlyRevenue ?? '',
        clientCount: res.input.clientCount,
        primaryGoal: res.input.primaryGoal,
        notes: res.input.notes ?? '',
      })
      plan.value = res.plan
      rawResponse.value = res.raw_response ?? res.raw_claude ?? null
    } catch (e: unknown) {
      const fe = e as { data?: { message?: string }; message?: string }
      error.value = fe?.data?.message || fe?.message || 'Could not generate plan'
    } finally {
      generating.value = false
    }
  }

  function inputPayloadForSave() {
    return {
      agencyType: form.agencyType,
      monthlyRevenue: form.monthlyRevenue.trim() || null,
      clientCount: form.clientCount,
      primaryGoal: form.primaryGoal,
      notes: form.notes.trim() || null,
    }
  }

  async function savePlan() {
    if (!plan.value) return
    error.value = ''
    saveMessage.value = ''
    saving.value = true
    try {
      await $fetch('/api/agency/plans', {
        method: 'POST',
        headers: authHeaders(),
        body: {
          input: inputPayloadForSave(),
          plan: plan.value,
          raw_response: rawResponse.value,
        },
      })
      saveMessage.value = 'Plan saved.'
    } catch (e: unknown) {
      const fe = e as { data?: { message?: string }; message?: string }
      error.value = fe?.data?.message || fe?.message || 'Could not save plan'
    } finally {
      saving.value = false
    }
  }

  async function addToTodos(includeQuickWins: boolean) {
    if (!plan.value) return
    const siteId = selectedSiteId.value.trim()
    if (!siteId) {
      error.value = 'Choose a site to attach tasks to.'
      return
    }
    const tasks = executionPlanToTodoTasks(plan.value, includeQuickWins)
    if (!tasks.length) {
      error.value = 'No steps to add.'
      return
    }
    error.value = ''
    saveMessage.value = ''
    addingTodos.value = true
    try {
      const res = await $fetch<{ created: number }>('/api/agency/add-todos', {
        method: 'POST',
        headers: authHeaders(),
        body: { siteId, tasks },
      })
      saveMessage.value = `Added ${res.created} task(s) to To Do.`
    } catch (e: unknown) {
      const fe = e as { data?: { message?: string }; message?: string }
      error.value = fe?.data?.message || fe?.message || 'Could not create tasks'
    } finally {
      addingTodos.value = false
    }
  }

  function resetFormToDefaults() {
    Object.assign(form, defaultForm())
  }

  return {
    form,
    plan,
    generating,
    saving,
    addingTodos,
    error,
    saveMessage,
    sites,
    selectedSiteId,
    loadSites,
    generate,
    savePlan,
    addToTodos,
    resetFormToDefaults,
  }
}
