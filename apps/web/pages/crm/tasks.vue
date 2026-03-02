<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-surface-900">Tasks</h1>
        <p class="mt-1 text-sm text-surface-500">Open and done tasks.</p>
      </div>
      <NuxtLink to="/crm" class="text-sm font-medium text-surface-600 hover:text-primary-600">← CRM</NuxtLink>
    </div>

    <nav class="mb-6 flex flex-wrap gap-1 border-b border-surface-200">
      <NuxtLink to="/crm" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Dashboard</NuxtLink>
      <NuxtLink to="/crm/clients" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Clients</NuxtLink>
      <NuxtLink to="/crm/pipeline" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Pipeline</NuxtLink>
      <NuxtLink to="/crm/tasks" class="border-b-2 border-primary-600 px-4 py-3 text-sm font-medium text-primary-600">Tasks</NuxtLink>
      <NuxtLink to="/crm/deals" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Deals</NuxtLink>
    </nav>

    <div class="mb-4 flex gap-2">
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

    <div v-if="pending" class="py-12 text-center text-surface-500">Loading…</div>
    <ul v-else-if="!tasks.length" class="rounded-xl border border-surface-200 bg-white py-12 text-center text-sm text-surface-500">No tasks.</ul>
    <ul v-else class="space-y-2">
      <li
        v-for="t in tasks"
        :key="t.id"
        class="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm"
        :class="isOverdue(t) ? 'border-red-200 bg-red-50/50' : 'border-surface-200'"
      >
        <div>
          <p class="font-medium text-surface-900">{{ t.title }}</p>
          <p class="text-sm text-surface-500">
            Due {{ formatDate(t.due_at) }}
            <span v-if="t.expand?.client" class="ml-2">· {{ (t.expand.client as { name: string }).name }}</span>
            · {{ t.priority }} · {{ t.status }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink v-if="t.client" :to="`/crm/clients/${typeof t.client === 'string' ? t.client : (t.client as { id: string }).id}`" class="text-sm text-primary-600 hover:underline">Client</NuxtLink>
          <button type="button" class="text-sm text-primary-600 hover:underline" @click="toggleStatus(t)">{{ t.status === 'open' ? 'Mark done' : 'Reopen' }}</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { CrmTask } from '~/types'

definePageMeta({ layout: 'default' })

const statusFilter = ref<'open' | 'done'>('open')
const { tasks, pending, load } = useCrmTasks()

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

function authHeaders(): Record<string, string> {
  const pb = usePocketbase()
  return pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}
}

async function toggleStatus(t: CrmTask) {
  try {
    await $fetch(`/api/crm/tasks/${t.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: { status: t.status === 'open' ? 'done' : 'open' },
    })
    await load(statusFilter)
  } catch {
    //
  }
}

onMounted(() => load(statusFilter))
</script>
