<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold text-white">Workspace</h1>
      <p class="mt-1 text-sm text-slate-400">
        Shared boards and prospect research before you reach out to new clients.
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
        :class="activeTab === 'research' ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'"
        @click="setTab('research')"
      >
        Research
      </button>
    </nav>

    <div class="mt-6">
      <CrmPipelineBoard v-show="activeTab === 'boards'" />

      <WorkspaceResearchPanel v-if="activeTab === 'research'" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

type WorkspaceTab = 'boards' | 'research'

const route = useRoute()
const router = useRouter()

function tabFromQuery(value: unknown): WorkspaceTab {
  const raw = String(value || '')
  if (raw === 'research') return 'research'
  // Legacy query values from the first Workspace ship.
  if (raw === 'pipeline' || raw === 'site-audits' || raw === 'boards' || !raw) return 'boards'
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
    activeTab.value = tabFromQuery(value)
  },
)
</script>
