<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-8">
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold text-white">Workspace</h1>
      <p class="mt-1 text-sm text-slate-400">
        Shared boards, site audits, and quick competitive snapshots for prospect outreach.
      </p>
    </div>

    <nav class="mt-6 inline-flex flex-wrap gap-1 rounded-lg border border-slate-700 bg-slate-900/60 p-1 text-sm" aria-label="Workspace sections">
      <button
        type="button"
        class="rounded-md px-4 py-2 font-medium"
        :class="activeTab === 'boards' ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'"
        @click="setTab('boards')"
      >
        Boards
      </button>
      <button
        type="button"
        class="rounded-md px-4 py-2 font-medium"
        :class="activeTab === 'site-audits' ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'"
        @click="setTab('site-audits')"
      >
        Site audits
      </button>
      <button
        type="button"
        class="rounded-md px-4 py-2 font-medium"
        :class="activeTab === 'competition' ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'"
        @click="setTab('competition')"
      >
        Competition
      </button>
    </nav>

    <div class="mt-6">
      <CrmPipelineBoard v-show="activeTab === 'boards'" />

      <WorkspaceSiteAuditPanel v-if="activeTab === 'site-audits'" />

      <WorkspaceCompetitionPanel v-if="activeTab === 'competition'" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

type WorkspaceTab = 'boards' | 'site-audits' | 'competition'

const route = useRoute()
const router = useRouter()

function tabFromQuery(value: unknown): WorkspaceTab {
  const raw = String(value || '')
  if (raw === 'site-audits') return 'site-audits'
  if (raw === 'competition') return 'competition'
  // Legacy: research / pipeline / boards / empty → boards
  return 'boards'
}

const activeTab = ref<WorkspaceTab>(tabFromQuery(route.query.tab))

function setTab(tab: WorkspaceTab) {
  activeTab.value = tab
  const query = { ...route.query }
  if (tab === 'boards') delete query.tab
  else query.tab = tab
  void router.replace({ query })
}

watch(
  () => route.query.tab,
  (value) => {
    const next = tabFromQuery(value)
    activeTab.value = next
    if (String(value || '') === 'research') {
      const query = { ...route.query }
      delete query.tab
      void router.replace({ query })
    }
  },
)
</script>
