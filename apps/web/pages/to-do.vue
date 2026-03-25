<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-surface-900">To Do</h1>
        <p class="mt-1 text-sm text-surface-500">Open and completed tasks.</p>
      </div>
      <NuxtLink to="/dashboard" class="text-sm font-medium text-surface-600 hover:text-primary-600">← Dashboard</NuxtLink>
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-lg border px-4 py-2 text-sm font-medium transition"
          :class="statusFilter === 'open' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-surface-300 text-surface-700 hover:bg-surface-50'"
          @click="statusFilter = 'open'; load('open')"
        >
          Open
        </button>
        <button
          type="button"
          class="rounded-lg border px-4 py-2 text-sm font-medium transition"
          :class="statusFilter === 'done' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-surface-300 text-surface-700 hover:bg-surface-50'"
          @click="statusFilter = 'done'; load('done')"
        >
          Done
        </button>
      </div>
      <button
        type="button"
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
        @click="openAddModal"
      >
        Add to-do
      </button>
    </div>

    <div v-if="pending" class="py-12 text-center text-sm text-surface-500">Loading…</div>
    <ul v-else-if="!tasks.length" class="rounded-xl border border-surface-200 bg-white py-12 text-center text-sm text-surface-500">
      No tasks.
    </ul>

    <ul v-else class="space-y-2">
      <li
        v-for="t in tasks"
        :key="t.id"
        class="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm"
        :class="isOverdue(t) ? 'border-red-200 bg-red-50/50' : 'border-surface-200'"
      >
        <div>
          <p class="font-medium text-surface-900">{{ t.title }}</p>
          <p class="mt-1 text-sm text-surface-500">
            Due {{ formatDate(t.due_at) }}
            <span v-if="t.expand?.site" class="ml-2">· {{ (t.expand.site as { name: string }).name }}</span>
            · {{ t.priority }} · {{ t.status }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <NuxtLink
            v-if="t.expand?.site && (t.expand.site as { id?: string }).id"
            :to="`/sites/${(t.expand.site as { id: string }).id}/to-do`"
            class="text-sm text-primary-600 hover:underline"
          >
            Site
          </NuxtLink>
          <button
            type="button"
            class="text-sm text-primary-600 hover:underline"
            @click="toggleStatus(t)"
          >
            {{ t.status === 'open' ? 'Mark done' : 'Reopen' }}
          </button>
        </div>
      </li>
    </ul>

    <CrmModal v-model="showAddModal" title="Add to-do">
      <form id="add-task-form" class="space-y-3" @submit.prevent="saveTask">
        <div>
          <label class="block text-sm font-medium text-surface-700">Site *</label>
          <select v-model="taskForm.site" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
            <option value="">Select site</option>
            <option
              v-for="s in sites"
              :key="s.id"
              :value="s.id"
            >
              {{ s.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Title *</label>
          <input v-model="taskForm.title" type="text" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Due date *</label>
          <input v-model="taskForm.due_at" type="date" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Priority</label>
          <select v-model="taskForm.priority" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
            <option value="low">Low</option>
            <option value="med">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50"
            @click="showAddModal = false"
          >
            Cancel
          </button>
          <button type="submit" form="add-task-form" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </template>
    </CrmModal>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord, TodoTask } from '~/types'
import { listSites } from '~/services/sites'

definePageMeta({ layout: 'default' })

const statusFilter = ref<'open' | 'done'>('open')
const { tasks, pending, load } = useTodoTasks()
const sites = ref<SiteRecord[]>([])
const sitesPending = ref(false)

const showAddModal = ref(false)
const saving = ref(false)
const taskForm = reactive({
  site: '',
  title: '',
  due_at: new Date().toISOString().slice(0, 10),
  priority: 'med' as 'low' | 'med' | 'high',
})

async function openAddModal() {
  taskForm.site = ''
  taskForm.title = ''
  taskForm.due_at = new Date().toISOString().slice(0, 10)
  taskForm.priority = 'med'

  const authId = await waitForAuthId()
  if (!authId) {
    alert('Not authenticated.')
    return
  }

  if (!sites.value.length) await loadSites()

  // Allow the dropdown to receive options before rendering the modal.
  await new Promise((r) => setTimeout(r, 0))

  // Prefill with the first site so the created task appears on a site page immediately.
  if (sites.value.length) taskForm.site = sites.value[0].id
  showAddModal.value = true
}

const pb = usePocketbase()

async function loadSites() {
  if (sitesPending.value) return
  sitesPending.value = true
  try {
    const res = await listSites(pb)
    sites.value = res.sites ?? []
  } finally {
    sitesPending.value = false
  }
}

async function waitForAuthId(): Promise<string | null> {
  const started = Date.now()
  while (Date.now() - started < 5000) {
    const authId = pb.authStore.model?.id as string | undefined
    if (authId) return authId
    await new Promise((r) => setTimeout(r, 100))
  }
  return null
}

async function saveTask() {
  if (saving.value || !taskForm.site?.trim() || !taskForm.title?.trim() || !taskForm.due_at) return
  saving.value = true
  try {
    const userId = pb.authStore.model?.id as string | undefined
    if (!userId) throw new Error('Not authenticated')

    let dueAt = taskForm.due_at
    if (/^\d{4}-\d{2}-\d{2}$/.test(dueAt)) dueAt = `${dueAt}T12:00:00.000Z`

    await pb.collection('todo_tasks').create({
      user: userId,
      site: taskForm.site.trim(),
      title: taskForm.title.trim(),
      due_at: dueAt,
      priority: taskForm.priority,
      status: 'open',
    })

    showAddModal.value = false
    await load(statusFilter.value)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    alert(err?.data?.message ?? err?.message ?? 'Failed to create task')
  } finally {
    saving.value = false
  }
}

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'short' })
}

function isOverdue(t: TodoTask) {
  if (t.status === 'done') return false
  const due = t.due_at ? new Date(t.due_at).toISOString().slice(0, 10) : ''
  const today = new Date().toISOString().slice(0, 10)
  return due && due < today
}

async function toggleStatus(t: TodoTask) {
  try {
    await pb.collection('todo_tasks').update(t.id, {
      status: t.status === 'open' ? 'done' : 'open',
    })
    await load(statusFilter.value)
  } catch {
    // ignore for now
  }
}

onMounted(async () => {
  void load(statusFilter.value)
  // Prime the dropdown so the modal always has options.
  const authId = await waitForAuthId()
  if (authId) void loadSites()
})
</script>

