<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-white">Sales</h1>
        <p class="mt-1 text-sm text-slate-400">
          Drag leads between stages, or drag the ⋮⋮ handle to reorder columns. Click a title to rename.
        </p>
      </div>
      <NuxtLink
        to="/crm/clients"
        class="rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
      >
        + Add contact
      </NuxtLink>
    </div>

    <CrmSubNav />

    <div
      v-if="stagesError"
      class="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
    >
      {{ stagesError }}
    </div>

    <div v-if="!pending && stageDefs.length" class="mb-6 flex flex-wrap gap-2">
      <div
        v-for="(stage, idx) in stageDefs"
        :key="stage.id"
        class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
        :class="crmStageTheme(stage.key, idx).chip"
      >
        <span class="h-1.5 w-1.5 rounded-full" :class="crmStageTheme(stage.key, idx).dot" />
        {{ stage.label }}
        <span class="opacity-80">· {{ (byStage[stage.key] || []).length }}</span>
      </div>
    </div>

    <div v-if="pending" class="py-16 text-center text-slate-500">Loading Sales pipeline…</div>
    <div v-else class="-mx-1 flex items-start gap-4 overflow-x-auto px-1 pb-6 pt-1">
      <CrmKanbanColumn
        v-for="(stage, idx) in stageDefs"
        :key="stage.id || stage.key"
        :title="stage.label"
        :items="byStage[stage.key] || []"
        :stage="stage.key"
        :stage-id="stage.id"
        :theme-index="idx"
        :editable-title="Boolean(stage.id)"
        :can-delete="Boolean(stage.id) && stageDefs.length > 1"
        :reorderable="Boolean(stage.id) && stageDefs.filter((s) => s.id).length > 1"
        label="leads"
        :item-id="(item) => (item as { id: string }).id"
        :item-title="(item) => leadDisplayName(item as CrmClient)"
        @drop="onDrop"
        @rename="onRenameStage"
        @delete-column="onDeleteStage"
        @column-drop="onColumnReorder"
      >
        <template #item="{ item, theme }">
          <NuxtLink
            :to="`/crm/clients/${(item as CrmClient).id}`"
            class="block"
            @click.stop
          >
            <p class="font-semibold text-white transition group-hover:text-blue-300">
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
        </template>
      </CrmKanbanColumn>

      <div class="w-72 shrink-0">
        <form
          v-if="addingColumn"
          class="rounded-xl border border-slate-600 bg-slate-900/70 p-3 shadow-lg"
          @submit.prevent="submitNewColumn"
        >
          <input
            ref="newColumnInput"
            v-model="newColumnName"
            class="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none"
            placeholder="Column name"
            @keydown.escape.prevent="addingColumn = false"
          />
          <div class="mt-2 flex gap-2">
            <button
              type="submit"
              class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-500"
            >
              Add column
            </button>
            <button type="button" class="rounded-lg px-3 py-1.5 text-xs text-slate-400" @click="addingColumn = false">
              Cancel
            </button>
          </div>
        </form>
        <button
          v-else
          type="button"
          class="w-full rounded-xl border border-dashed border-slate-600/80 bg-slate-900/30 px-4 py-8 text-sm font-medium text-slate-400 transition hover:border-slate-500 hover:bg-slate-900/60 hover:text-slate-200"
          @click="startAddColumn"
        >
          + Add a column
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CrmClient } from '~/types'
import { crmStageTheme } from '~/utils/crmPipelineStage'

definePageMeta({ layout: 'default' })

const {
  byStage,
  displayStageDefs,
  pending,
  stagesError,
  load,
  moveClient,
  renameStage,
  addStage,
  deleteStage,
  reorderStages,
} = useCrmPipeline()

const stageDefs = displayStageDefs

const addingColumn = ref(false)
const newColumnName = ref('')
const newColumnInput = ref<HTMLInputElement | null>(null)

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

async function onRenameStage(stageKey: string, title: string) {
  const def = stageDefs.value.find((s) => s.key === stageKey)
  if (!def) return
  try {
    await renameStage(def.id, title)
  } catch (e: unknown) {
    alert((e as Error)?.message ?? 'Failed to rename column')
  }
}

async function onDeleteStage(stageKey: string) {
  const def = stageDefs.value.find((s) => s.key === stageKey)
  if (!def) return
  if (!confirm(`Delete column “${def.label}”? Leads in it move to another column.`)) return
  try {
    await deleteStage(def.id)
  } catch (e: unknown) {
    alert((e as Error)?.message ?? 'Failed to delete column')
  }
}

async function onColumnReorder(fromStageId: string, toStageId: string) {
  const ordered = stageDefs.value.filter((s) => s.id)
  const fromIdx = ordered.findIndex((s) => s.id === fromStageId)
  const toIdx = ordered.findIndex((s) => s.id === toStageId)
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
  const next = [...ordered]
  const [moved] = next.splice(fromIdx, 1)
  next.splice(toIdx, 0, moved)
  try {
    await reorderStages(next.map((s) => s.id))
  } catch (e: unknown) {
    alert((e as Error)?.message ?? 'Failed to reorder columns')
  }
}

function startAddColumn() {
  addingColumn.value = true
  newColumnName.value = ''
  nextTick(() => newColumnInput.value?.focus())
}

async function submitNewColumn() {
  const label = newColumnName.value.trim() || 'New stage'
  try {
    await addStage(label)
    addingColumn.value = false
    newColumnName.value = ''
  } catch (e: unknown) {
    alert((e as Error)?.message ?? 'Failed to add column')
  }
}

onMounted(() => load())
</script>
