<template>
  <div>
    <div class="mb-6">
      <h2 class="text-lg font-semibold text-white">Competitive snapshot</h2>
      <p class="mt-1 max-w-3xl text-sm text-slate-400">
        See who ranks for a prospect’s money keywords — top competitors, overlap, and plain-language gaps you can use on a call
        (“you’re behind X on Y”).
      </p>
    </div>

    <section class="mb-8 rounded-xl border border-slate-700/70 bg-slate-900/50 p-5 shadow-sm sm:p-6">
      <form class="space-y-4" @submit.prevent="runSnapshot">
        <div>
          <label for="comp-domain" class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Prospect domain *
          </label>
          <input
            id="comp-domain"
            v-model="form.targetDomain"
            type="text"
            required
            class="w-full max-w-md rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="e.g. prospect.com"
          />
        </div>
        <div>
          <label for="comp-keywords" class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Money keywords <span class="normal-case text-slate-600">(optional, up to 5)</span>
          </label>
          <textarea
            id="comp-keywords"
            v-model="form.keywords"
            rows="3"
            class="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="One per line or comma-separated&#10;e.g. emergency plumber austin"
          />
          <p class="mt-1 text-xs text-slate-500">
            Leave blank to auto-pick the domain’s highest-volume ranked keywords (DataForSEO Labs).
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
            :disabled="running || !form.targetDomain.trim()"
          >
            {{ running ? 'Checking SERPs…' : 'Run snapshot' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            :disabled="pending"
            @click="loadSnapshots"
          >
            Refresh
          </button>
        </div>
        <p v-if="running" class="text-xs text-slate-500">
          Pulling US Google SERPs for each keyword — usually under a minute.
        </p>
        <p v-if="error" class="text-sm text-rose-300">{{ error }}</p>
      </form>
    </section>

    <div v-if="pending && !snapshots.length" class="py-10 text-center text-slate-500">Loading snapshots…</div>
    <p
      v-else-if="!snapshots.length"
      class="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-4 py-10 text-center text-sm text-slate-500"
    >
      No snapshots yet. Run one above before your next sales call.
    </p>

    <section
      v-for="snap in snapshots"
      :key="snapshotKey(snap)"
      class="mb-6 rounded-xl border border-slate-700/70 bg-slate-900/50 p-5 shadow-sm sm:p-6"
    >
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-lg font-medium text-white">{{ snap.targetDomain }}</h3>
          <p class="mt-0.5 text-xs text-slate-500">
            {{ formatDate(snap.updatedAt) }}
            · {{ snap.keywordSource === 'auto' ? 'Auto keywords' : 'Custom keywords' }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
          :disabled="deletingKey === snapshotKey(snap)"
          @click="deleteSnapshot(snap)"
        >
          {{ deletingKey === snapshotKey(snap) ? 'Deleting…' : 'Delete' }}
        </button>
      </div>

      <div v-if="snap.talkingPoints.length" class="mb-5 rounded-lg border border-sky-500/30 bg-sky-500/10 p-4">
        <h4 class="mb-2 text-sm font-semibold text-sky-100">Sales angles</h4>
        <ul class="list-disc space-y-1 pl-5 text-sm text-sky-50/90">
          <li v-for="point in snap.talkingPoints" :key="point">{{ point }}</li>
        </ul>
      </div>

      <div v-if="snap.competitors.length" class="mb-5">
        <h4 class="mb-2 text-sm font-semibold text-white">Who shows up most</h4>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="c in snap.competitors"
            :key="c.domain"
            class="rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm"
          >
            <span class="font-medium text-white">{{ c.domain }}</span>
            <span class="ml-2 text-xs text-slate-400">{{ c.overlapCount }}/{{ snap.keywords.length }} SERPs</span>
          </div>
        </div>
      </div>

      <div class="overflow-x-auto rounded-lg border border-slate-700">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-950/60 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2.5 font-medium">Keyword</th>
              <th class="px-3 py-2.5 font-medium">You</th>
              <th class="px-3 py-2.5 font-medium">Leader</th>
              <th class="hidden px-3 py-2.5 font-medium sm:table-cell">Volume</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800 text-slate-200">
            <tr v-for="row in snap.keywordRows" :key="row.keyword">
              <td class="max-w-[200px] px-3 py-2.5 font-medium text-white">{{ row.keyword }}</td>
              <td class="px-3 py-2.5 tabular-nums">
                <span v-if="row.prospectPosition">{{ `#${row.prospectPosition}` }}</span>
                <span v-else class="text-amber-300/90">Not top 10</span>
              </td>
              <td class="px-3 py-2.5">
                <template v-if="row.leader">
                  <span class="font-medium">{{ row.leader.domain }}</span>
                  <span class="ml-1 tabular-nums text-slate-400">#{{ row.leader.position }}</span>
                </template>
                <span v-else class="text-slate-500">—</span>
              </td>
              <td class="hidden px-3 py-2.5 tabular-nums text-slate-400 sm:table-cell">
                {{ row.searchVolume != null ? row.searchVolume.toLocaleString() : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { CompetitiveSnapshot } from '~/utils/competitiveSnapshot'
import { snapshotMatchKey } from '~/utils/competitiveSnapshot'

const pb = usePocketbase()
const pending = ref(true)
const running = ref(false)
const error = ref('')
const snapshots = ref<CompetitiveSnapshot[]>([])
const deletingKey = ref('')

const form = reactive({
  targetDomain: '',
  keywords: '',
})

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function snapshotKey(snap: CompetitiveSnapshot) {
  return snapshotMatchKey(snap.targetDomain)
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

async function loadSnapshots() {
  pending.value = true
  error.value = ''
  try {
    const res = await $fetch<{ snapshots: CompetitiveSnapshot[] }>('/api/workspace/competitive-snapshots', {
      headers: authHeaders(),
    })
    snapshots.value = res.snapshots ?? []
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Could not load snapshots.'
  } finally {
    pending.value = false
  }
}

async function runSnapshot() {
  if (!form.targetDomain.trim()) return
  running.value = true
  error.value = ''
  try {
    const res = await $fetch<{ snapshots: CompetitiveSnapshot[] }>('/api/workspace/competitive-snapshots', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        targetDomain: form.targetDomain.trim(),
        keywords: form.keywords.trim() || undefined,
      },
      timeout: 120_000,
    })
    snapshots.value = res.snapshots ?? []
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Snapshot failed.'
  } finally {
    running.value = false
  }
}

async function deleteSnapshot(snap: CompetitiveSnapshot) {
  const key = snapshotKey(snap)
  if (!window.confirm(`Delete competitive snapshot for ${snap.targetDomain}?`)) return
  deletingKey.value = key
  error.value = ''
  try {
    const res = await $fetch<{ snapshots: CompetitiveSnapshot[] }>(
      '/api/workspace/competitive-snapshots/delete',
      {
        method: 'DELETE',
        headers: authHeaders(),
        query: { key },
      },
    )
    snapshots.value = res.snapshots ?? []
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? err?.message ?? 'Could not delete.'
  } finally {
    deletingKey.value = ''
  }
}

onMounted(() => loadSnapshots())
</script>
