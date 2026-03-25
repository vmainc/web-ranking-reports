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
            <span v-if="t.expand?.client" class="ml-2">· {{ (t.expand.client as { name: string }).name }}</span>
            · {{ t.priority }} · {{ t.status }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <NuxtLink
            v-if="t.client"
            :to="`/crm/clients/${typeof t.client === 'string' ? t.client : (t.client as { id: string }).id}`"
            class="text-sm text-primary-600 hover:underline"
          >
            Client
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
          <label class="block text-sm font-medium text-surface-700">Client *</label>
          <select v-model="taskForm.client" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
            <option value="">Select client</option>
            <option
              v-for="c in siteClients"
              :key="c.id"
              :value="c.id"
            >
              {{ c.name }}{{ c.company ? ` (${c.company})` : '' }}
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
import type { CrmTask } from '~/types'

definePageMeta({ layout: 'default' })

const statusFilter = ref<'open' | 'done'>('open')
const { tasks, pending, load } = useCrmTasks()
const { clients, pending: clientsPending, load: loadClients } = useCrmClients()

function isClientLinkedToASite(c: { site?: unknown } | null | undefined): boolean {
  const s = c?.site
  if (s === null || s === undefined) return false
  if (typeof s === 'string') return !!s.trim()
  if (Array.isArray(s)) return s.length > 0
  // PocketBase can return relation values as objects; treat any non-null object as linked.
  if (typeof s === 'object') return true
  return false
}

const siteClients = computed(() => {
  const linked = clients.value.filter((c) => isClientLinkedToASite(c))
  // If nothing is linked (or relation shape differs), fall back to all clients so the UI remains usable.
  return linked.length ? linked : clients.value
})

const showAddModal = ref(false)
const saving = ref(false)
const taskForm = reactive({
  client: '',
  title: '',
  due_at: new Date().toISOString().slice(0, 10),
  priority: 'med' as 'low' | 'med' | 'high',
})

async function openAddModal() {
  taskForm.client = ''
  taskForm.title = ''
  taskForm.due_at = new Date().toISOString().slice(0, 10)
  taskForm.priority = 'med'

  const authId = await waitForAuthId()
  if (!authId) {
    alert('Not authenticated.')
    return
  }

  if (!clients.value.length || !siteClients.value.length) {
    await loadClients()
  }

  // Allow the dropdown to receive options before rendering the modal.
  await new Promise((r) => setTimeout(r, 0))

  // Prefill with the first site-linked client so the created task appears on a site page immediately.
  if (siteClients.value.length) taskForm.client = siteClients.value[0].id
  showAddModal.value = true
}

const pb = usePocketbase()

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
  if (saving.value || !taskForm.client?.trim() || !taskForm.title?.trim() || !taskForm.due_at) return
  saving.value = true
  try {
    const userId = pb.authStore.model?.id as string | undefined
    if (!userId) throw new Error('Not authenticated')

    let dueAt = taskForm.due_at
    if (/^\d{4}-\d{2}-\d{2}$/.test(dueAt)) dueAt = `${dueAt}T12:00:00.000Z`

    await pb.collection('crm_tasks').create({
      user: userId,
      client: taskForm.client.trim(),
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

function isOverdue(t: CrmTask) {
  if (t.status === 'done') return false
  const due = t.due_at ? new Date(t.due_at).toISOString().slice(0, 10) : ''
  const today = new Date().toISOString().slice(0, 10)
  return due && due < today
}

async function toggleStatus(t: CrmTask) {
  try {
    await pb.collection('crm_tasks').update(t.id, {
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
  if (authId) void loadClients()
})
</script>

