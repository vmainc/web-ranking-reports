<template>
  <div class="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
    <table class="min-w-full divide-y divide-surface-200">
      <thead class="bg-surface-50">
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-surface-500"
            :class="col.class"
          >
            {{ col.label }}
          </th>
          <th v-if="$slots.actions" class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-surface-500">
            Actions
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-surface-200 bg-white">
        <tr v-for="(row, i) in rows" :key="rowKey(row, i)" class="hover:bg-surface-50/50">
          <td
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 text-sm"
            :class="col.class"
          >
            <slot :name="`cell-${col.key}`" :row="row" :value="getCellValue(row, col)">
              {{ getCellValue(row, col) }}
            </slot>
          </td>
          <td v-if="$slots.actions" class="px-4 py-3 text-right">
            <slot name="actions" :row="row" />
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="!rows.length && !pending" class="px-6 py-8 text-center text-sm text-surface-500">
      <slot name="empty">No data.</slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Column {
  key: string
  label: string
  class?: string
  path?: string
}

const props = withDefaults(
  defineProps<{
    columns: Column[]
    rows: unknown[]
    rowKey?: (row: unknown, index: number) => string
    pending?: boolean
  }>(),
  { pending: false }
)

function getCellValue(row: unknown, col: Column): unknown {
  const path = col.path ?? col.key
  const parts = String(path).split('.')
  let v: unknown = row
  for (const p of parts) {
    v = (v as Record<string, unknown>)?.[p]
  }
  return v
}

function rowKey(row: unknown, i: number): string {
  if (props.rowKey) return props.rowKey(row, i)
  const r = row as { id?: string }
  return r?.id ?? String(i)
}
</script>
