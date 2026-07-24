<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-white">Leads pipeline</h1>
        <p class="mt-1 text-sm text-slate-400">Drag cards between stages to update progress.</p>
      </div>
      <NuxtLink
        to="/crm/clients"
        class="crm-toolbar-btn rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
      >
        + Add contact
      </NuxtLink>
    </div>

    <CrmSubNav />

    <div v-if="!pending" class="mb-6 flex flex-wrap gap-2">
      <div
        v-for="stage in stages"
        :key="stage"
        class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
        :class="crmStageTheme(stage).chip"
      >
        <span class="h-1.5 w-1.5 rounded-full" :class="crmStageTheme(stage).dot" />
        {{ crmStageLabel(stage) }}
        <span class="opacity-80">· {{ (byStage[stage] || []).length }}</span>
      </div>
    </div>

    <div v-if="pending" class="py-16 text-center text-slate-500">Loading pipeline…</div>
    <div v-else class="-mx-1 flex gap-4 overflow-x-auto px-1 pb-6 pt-1">
      <CrmKanbanColumn
        v-for="stage in stages"
        :key="stage"
        :title="crmStageLabel(stage)"
        :items="byStage[stage] || []"
        :stage="stage"
        label="cards"
        :item-id="(item) => (item as { id: string }).id"
        :item-title="(item) => leadDisplayName(item as CrmClient)"
        @drop="onDrop"
      >
        <template #item="{ item, theme }">
          <NuxtLink
            :to="`/crm/clients/${(item as CrmClient).id}`"
            class="block"
            @click.stop
          >
            <p class="font-semibold text-white transition group-hover:text-blue-600">
              {{ leadDisplayName(item as CrmClient) }}
            </p>
            <p v-if="(item as CrmClient).company" class="mt-0.5 truncate text-xs text-slate-400">
              {{ (item as CrmClient).company }}
            </p>
            <div v-if="leadMeta(item as CrmClient).length" class="mt-2 flex flex-wrap gap-1">
              <span
                v-for="tag in leadMeta(item as CrmClient)"
                :key="tag"
                class="inline-flex max-w-full truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
                :class="theme.chip"
              >
                {{ tag }}
              </span>
            </div>
          </NuxtLink>
          <div v-if="stage === 'proposal'" class="mt-2 print:hidden">
            <button
              type="button"
              class="crm-pipeline-cta text-[11px] font-semibold text-amber-300/90 hover:text-amber-200"
              @click.stop="createProposalForLead(item as CrmClient)"
            >
              Create / open proposal →
            </button>
          </div>
        </template>
      </CrmKanbanColumn>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CrmClient } from '~/types'
import { crmStageLabel, crmStageTheme } from '~/utils/crmPipelineStage'

definePageMeta({ layout: 'default' })

const { byStage, stages, pending, load, moveClient } = useCrmPipeline()

function leadDisplayName(c: CrmClient): string {
  const firstLast = [c.first_name?.trim(), c.last_name?.trim()].filter(Boolean).join(' ')
  const name = firstLast || c.name?.trim() || ''
  return [c.name_prefix?.trim(), name].filter(Boolean).join(' ') || 'Unnamed lead'
}

function leadMeta(c: CrmClient): string[] {
  const tags: string[] = []
  if (c.source?.trim()) tags.push(c.source.trim())
  if (c.next_step?.trim()) tags.push(c.next_step.trim())
  return tags.slice(0, 2)
}

async function onDrop(itemOrId: unknown, stage: string) {
  const clientId = typeof itemOrId === 'string' ? itemOrId : (itemOrId as CrmClient)?.id
  if (!clientId) return
  try {
    await moveClient(clientId, stage)
  } catch (e: unknown) {
    alert((e as Error)?.message ?? 'Failed to update')
  }
}

const router = useRouter()

async function createProposalForLead(client: CrmClient) {
  const pb = usePocketbase()
  const headers = pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}
  try {
    const existing = await $fetch<{ proposals: Array<{ id: string; status: string }> }>('/api/crm/proposals', {
      headers,
      query: { client: client.id },
    })
    const open = (existing.proposals || []).find((p) => ['draft', 'sent', 'viewed'].includes(p.status))
    if (open) {
      await router.push(`/crm/proposals/${open.id}`)
      return
    }
    const title = `${client.company || client.name || 'Proposal'}`.trim()
    const data = await $fetch<{ proposal: { id: string } }>('/api/crm/proposals', {
      method: 'POST',
      headers,
      body: { client: client.id, title },
    })
    await router.push(`/crm/proposals/${data.proposal.id}`)
  } catch (e: unknown) {
    alert((e as { data?: { message?: string }; message?: string })?.data?.message ?? (e as Error).message ?? 'Failed')
  }
}

onMounted(() => load())
</script>
