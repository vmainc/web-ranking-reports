import type { Ref } from 'vue'
import type { SiteRecord, TodoTask } from '~/types'

export function useTodoTasks() {
  const pb = usePocketbase()
  const tasks = ref<(TodoTask & { expand?: { site?: SiteRecord } })[]>([])
  const pending = ref(false)
  const error = ref('')

  async function load(statusFilter?: 'open' | 'done') {
    pending.value = true
    error.value = ''
    try {
      const authId = pb.authStore.model?.id as string | undefined
      if (!authId) {
        tasks.value = []
        return
      }
      const parts: string[] = [`user = "${authId}"`]
      if (statusFilter) parts.push(`status = "${statusFilter}"`)
      const list = await pb.collection('todo_tasks').getFullList<TodoTask & { expand?: { site?: SiteRecord } }>({
        filter: parts.join(' && '),
        sort: 'due_at',
        expand: 'site',
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

