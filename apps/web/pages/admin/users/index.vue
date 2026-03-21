<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <NuxtLink
      to="/dashboard"
      class="mb-6 inline-flex items-center gap-1 text-sm font-medium text-surface-500 hover:text-primary-600"
    >
      ← Dashboard
    </NuxtLink>
    <h1 class="mb-2 text-2xl font-semibold text-surface-900">Admin – Users</h1>
    <p class="mb-6 text-sm text-surface-500">
      PocketBase accounts in the <strong>{{ collectionLabel }}</strong> collection. Only
      <strong>admin@vma.agency</strong> (and configured admin emails) can access this page.
    </p>
    <p class="mb-6 rounded-lg border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-600">
      <span class="font-medium text-surface-800">Types:</span>
      <strong class="text-violet-800">Admin</strong> — platform admins (<code class="text-xs">ADMIN_EMAILS</code>).
      <strong class="text-sky-800">Agency</strong> — full app users (default).
      <strong class="text-amber-900">Client</strong> — invited read-only users (set
      <code class="text-xs">account_type</code> to <code class="text-xs">client</code> or <code class="text-xs">is_client</code>
      on the user record). Wire site access in your invite flow as needed.
    </p>

    <AdminNav />

    <div v-if="allowed === null" class="rounded-xl border border-surface-200 bg-white p-6 text-surface-600">
      <p class="text-sm">Checking access…</p>
    </div>

    <div v-else-if="!allowed" class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
      <p>You don’t have access to this page.</p>
      <p v-if="hint" class="mt-2 text-sm">{{ hint }}</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-sm font-medium underline">Back to Dashboard</NuxtLink>
    </div>

    <template v-else>
      <div v-if="loadError" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {{ loadError }}
      </div>

      <div v-else class="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-surface-100 bg-surface-50 px-4 py-3">
          <p class="text-sm text-surface-600">
            <span class="font-medium text-surface-800">{{ total }}</span>
            user{{ total === 1 ? '' : 's' }}
          </p>
          <button
            type="button"
            class="rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-sm font-medium text-surface-700 shadow-sm transition hover:bg-surface-50 disabled:opacity-50"
            :disabled="loading"
            @click="refresh"
          >
            {{ loading ? 'Refreshing…' : 'Refresh' }}
          </button>
        </div>

        <div v-if="loading && !users.length" class="p-8 text-center text-sm text-surface-500">Loading users…</div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-surface-200 text-left text-sm">
            <thead class="bg-surface-50 text-xs font-semibold uppercase tracking-wide text-surface-600">
              <tr>
                <th class="px-4 py-3">Email</th>
                <th class="px-4 py-3">Name</th>
                <th class="px-4 py-3">Verified</th>
                <th class="px-4 py-3">Created</th>
                <th class="hidden px-4 py-3 sm:table-cell">ID</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-100">
              <tr v-for="u in users" :key="u.id" class="hover:bg-surface-50/80">
                <td class="whitespace-nowrap px-4 py-3 font-medium text-surface-900">{{ u.email || '—' }}</td>
                <td class="max-w-[12rem] truncate px-4 py-3 text-surface-700">{{ u.name || '—' }}</td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="kindBadgeClass(u.userKind)"
                    :title="kindTitle(u.userKind)"
                  >
                    {{ kindLabel(u.userKind) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="u.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'"
                  >
                    {{ u.verified ? 'Yes' : 'No' }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-surface-600">{{ formatDate(u.created) }}</td>
                <td class="hidden max-w-[10rem] truncate px-4 py-3 font-mono text-xs text-surface-500 sm:table-cell">
                  {{ u.id }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="!loading && !users.length" class="p-8 text-center text-sm text-surface-500">No users found.</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { AdminUserRow, AppUserKind } from '~/server/api/admin/users.get'

definePageMeta({
  layout: 'default',
})

const pb = usePocketbase()
const { allowed, hint } = useAdminGate()

const users = ref<AdminUserRow[]>([])
const total = ref(0)
const collectionLabel = ref('users')
const loading = ref(false)
const loadError = ref('')

function kindLabel(k: AppUserKind) {
  switch (k) {
    case 'admin':
      return 'Admin'
    case 'agency':
      return 'Agency'
    case 'client':
      return 'Client'
  }
}

function kindBadgeClass(k: AppUserKind) {
  switch (k) {
    case 'admin':
      return 'bg-violet-100 text-violet-900 ring-1 ring-violet-200'
    case 'agency':
      return 'bg-sky-100 text-sky-900 ring-1 ring-sky-200'
    case 'client':
      return 'bg-amber-50 text-amber-950 ring-1 ring-amber-200'
  }
}

function kindTitle(k: AppUserKind) {
  switch (k) {
    case 'admin':
      return 'Platform admin (ADMIN_EMAILS)'
    case 'agency':
      return 'Agency user — full app access (subject to your rules)'
    case 'client':
      return 'Client — invited read-only; only allowed sites (set in your invite flow)'
  }
}

function formatDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

async function refresh() {
  if (!import.meta.client || allowed.value !== true) return
  loading.value = true
  loadError.value = ''
  try {
    const token = pb.authStore.token
    const res = await $fetch<{
      collectionName?: string
      total?: number
      users: AdminUserRow[]
    }>('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    })
    collectionLabel.value = res.collectionName || 'users'
    total.value = res.total ?? res.users?.length ?? 0
    users.value = res.users ?? []
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'data' in e
      ? (e as { data?: { message?: string } }).data?.message
      : undefined
    loadError.value = msg || (e instanceof Error ? e.message : 'Could not load users.')
    users.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

watch(
  allowed,
  (ok) => {
    if (ok === true) void refresh()
  },
  { immediate: true },
)
</script>
