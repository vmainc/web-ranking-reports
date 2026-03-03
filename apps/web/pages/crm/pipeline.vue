<template>
  <div class="mx-auto max-w-full px-4 py-8 sm:px-6">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-surface-900">Pipeline</h1>
        <p class="mt-1 text-sm text-surface-500">Drag cards to change stage.</p>
      </div>
      <NuxtLink to="/crm" class="text-sm font-medium text-surface-600 hover:text-primary-600">← CRM</NuxtLink>
    </div>

    <nav class="mb-6 flex flex-wrap gap-1 border-b border-surface-200">
      <NuxtLink to="/crm" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Dashboard</NuxtLink>
      <NuxtLink to="/crm/clients" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Clients</NuxtLink>
      <NuxtLink to="/crm/pipeline" class="border-b-2 border-primary-600 px-4 py-3 text-sm font-medium text-primary-600">Pipeline</NuxtLink>
      <NuxtLink to="/crm/tasks" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Tasks</NuxtLink>
      <NuxtLink to="/crm/deals" class="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-surface-600 hover:text-surface-900">Deals</NuxtLink>
    </nav>

    <div v-if="pending" class="py-12 text-center text-surface-500">Loading…</div>
    <div v-else class="flex gap-4 overflow-x-auto pb-4">
      <CrmKanbanColumn
        v-for="stage in stages"
        :key="stage"
        :title="stageLabel(stage)"
        :items="byStage[stage] || []"
        :stage="stage"
        label="cards"
        :item-id="(item) => (item as { id: string }).id"
        :item-title="(item) => (item as { name: string }).name"
        @drop="onDrop"
      >
        <template #item="{ item }">
          <NuxtLink :to="`/crm/clients/${(item as { id: string }).id}`" class="block font-medium text-surface-900 hover:text-primary-600" @click.stop>{{ (item as { name: string }).name }}</NuxtLink>
          <p v-if="(item as { company?: string }).company" class="mt-0.5 text-xs text-surface-500">{{ (item as { company: string }).company }}</p>
        </template>
      </CrmKanbanColumn>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CrmClient } from '~/types'

definePageMeta({ layout: 'default' })

const { byStage, stages, pending, load, moveClient } = useCrmPipeline()

function stageLabel(s: string) {
  const labels: Record<string, string> = {
    new: 'New',
    contacted: 'Contacted',
    qualified: 'Qualified',
    proposal: 'Proposal',
    won: 'Won',
    lost: 'Lost',
  }
  return labels[s] ?? s
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

onMounted(() => load())
</script>
