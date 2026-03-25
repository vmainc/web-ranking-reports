<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <NuxtLink
          v-if="site"
          :to="`/sites/${site.id}`"
          class="mb-2 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
        >
          ← {{ site.name }}
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-surface-900">To Do</h1>
        <p class="mt-1 text-sm text-surface-500">Tasks for this site.</p>
      </div>
      <NuxtLink to="/dashboard" class="text-sm font-medium text-surface-600 hover:text-primary-600">← Dashboard</NuxtLink>
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-lg border px-4 py-2 text-sm font-medium transition"
          :class="statusFilter === 'open' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-surface-300 text-surface-700 hover:bg-surface-50'"
          @click="statusFilter = 'open'; load(statusFilter)"
        >
          Open
        </button>
        <button
          type="button"
          class="rounded-lg border px-4 py-2 text-sm font-medium transition"
          :class="statusFilter === 'done' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-surface-300 text-surface-700 hover:bg-surface-50'"
          @click="statusFilter = 'done'; load(statusFilter)"
        >
          Done
        </button>
      </div>

      <button
        type="button"
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
        :disabled="pending || siteTaskSaving"
        @click="openAddModal"
      >
        Add to-do
      </button>
    </div>

    <div v-if="pending" class="py-12 text-center text-sm text-surface-500">Loading…</div>
    <ul v-else-if="!tasksPending && !siteTasks.length" class="rounded-xl border border-surface-200 bg-white py-12 text-center text-sm text-surface-500">
      No tasks.
    </ul>

    <ul v-else-if="tasksPending" class="py-6 text-center text-sm text-surface-500">Loading…</ul>
    <ul v-else class="space-y-2">
      <li
        v-for="t in siteTasks"
        :key="t.id"
        class="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm"
        :class="isOverdue(t) ? 'border-red-200 bg-red-50/50' : 'border-surface-200'"
      >
        <div>
          <p class="font-medium text-surface-900">{{ t.title }}</p>
          <p class="mt-1 text-sm text-surface-500">
            Due {{ formatDate(t.due_at) }}
            · {{ t.priority }} · {{ t.status }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button type="button" class="text-sm text-primary-600 hover:underline" @click="toggleStatus(t)">
            {{ t.status === 'open' ? 'Mark done' : 'Reopen' }}
          </button>
        </div>
      </li>
    </ul>

    <CrmModal v-model="showAddModal" title="Add to-do">
      <form id="site-add-task-form" class="space-y-3" @submit.prevent="createSiteTask">
        <div>
          <label class="block text-sm font-medium text-surface-700">Title *</label>
          <input v-model="siteTaskForm.title" type="text" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Due date *</label>
          <input v-model="siteTaskForm.due_at" type="date" required class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-surface-700">Priority</label>
          <select v-model="siteTaskForm.priority" class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 text-sm">
            <option value="low">Low</option>
            <option value="med">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-50" @click="showAddModal = false">
            Cancel
          </button>
          <button
            type="submit"
            form="site-add-task-form"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="siteTaskSaving"
          >
            {{ siteTaskSaving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </template>
    </CrmModal>
  </div>
</template>

<script setup lang="ts">
import type { SiteRecord, TodoTask } from '~/types'
import { getSite } from '~/services/sites'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteId = computed(() => route.params.id as string)
const pb = usePocketbase()

const site = ref<SiteRecord | null>(null)
const pending = ref(true)

const statusFilter = ref<'open' | 'done'>('open')
const siteTasks = ref<TodoTask[]>([])
const tasksPending = ref(false)

const showAddModal = ref(false)
const siteTaskSaving = ref(false)
const siteTaskForm = reactive({
  title: '',
  due_at: new Date().toISOString().slice(0, 10),
  priority: 'med' as 'low' | 'med' | 'high',
})

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

function getAuthUserId(): string | undefined {
  return pb.authStore.model?.id as string | undefined
}

async function waitForAuthId(timeoutMs = 10000, pollMs = 200): Promise<string | null> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const id = getAuthUserId()
    if (id) return id
    await new Promise((r) => setTimeout(r, pollMs))
  }
  return null
}

async function load(status: 'open' | 'done' = statusFilter.value) {
  if (!site.value) return
  const authId = getAuthUserId()
  if (!authId) return
  tasksPending.value = true
  try {
    const list = await pb.collection('todo_tasks').getFullList<TodoTask>({
      filter: `user = "${authId}" && status = "${status}" && site = "${site.value.id}"`,
      sort: 'due_at',
    })
    siteTasks.value = list
  } catch {
    siteTasks.value = []
  } finally {
    tasksPending.value = false
  }
}

async function openAddModal() {
  siteTaskForm.title = ''
  siteTaskForm.due_at = new Date().toISOString().slice(0, 10)
  siteTaskForm.priority = 'med'
  showAddModal.value = true
}

async function createSiteTask() {
  if (siteTaskSaving.value) return
  const authId = getAuthUserId()
  if (!authId) return
  const title = siteTaskForm.title.trim()
  const dueInput = siteTaskForm.due_at
  if (!title || !dueInput) return

  siteTaskSaving.value = true
  let dueAt = dueInput
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueAt)) dueAt = `${dueAt}T12:00:00.000Z`

  try {
    await pb.collection('todo_tasks').create({
      user: authId,
      site: site.value?.id,
      title,
      due_at: dueAt,
      priority: siteTaskForm.priority,
      status: 'open',
    })

    showAddModal.value = false
    await load(statusFilter.value)
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string }; message?: string })?.data?.message ?? (e as Error)?.message ?? 'Failed to create task'
    alert(msg)
  } finally {
    siteTaskSaving.value = false
  }
}

async function toggleStatus(t: TodoTask) {
  try {
    await pb.collection('todo_tasks').update(t.id, {
      status: t.status === 'open' ? 'done' : 'open',
    })
    await load(statusFilter.value)
  } catch {
    // ignore
  }
}

async function init() {
  pending.value = true
  try {
    site.value = await getSite(pb, siteId.value)
    if (!site.value) return
    const authId = await waitForAuthId()
    if (!authId) return
    await load(statusFilter.value)
  } finally {
    pending.value = false
  }
}

onMounted(() => init())
watch(siteId, () => init())
</script>

