<template>
  <div class="overflow-x-auto">
    <table
      class="min-w-full text-left text-sm"
      :class="vibrant ? 'divide-y divide-slate-700/60' : 'divide-y divide-surface-200'"
    >
      <thead :class="vibrant ? 'bg-slate-800/60' : 'bg-surface-50'">
        <tr>
          <th
            v-for="(col, i) in columns"
            :key="i"
            class="px-4 py-2 font-medium"
            :class="[vibrant ? 'text-slate-300' : 'text-surface-700', col.thClass]"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody :class="vibrant ? 'divide-y divide-slate-700/50' : 'divide-y divide-surface-200'">
        <tr v-for="(row, ri) in rows" :key="ri" :class="vibrant ? 'hover:bg-slate-800/40' : 'hover:bg-surface-50/50'">
          <td
            v-for="(col, ci) in columns"
            :key="ci"
            class="px-4 py-2"
            :class="[vibrant ? 'text-slate-300' : 'text-surface-600', col.tdClass]"
          >
            {{ col.format ? col.format(row[col.field]) : row[col.field] }}
          </td>
        </tr>
      </tbody>
    </table>
    <p
      v-if="emptyMessage && (!rows || rows.length === 0)"
      :class="vibrant ? 'py-6 text-center text-sm text-slate-500' : 'py-6 text-center text-sm text-surface-500'"
    >
      {{ emptyMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
const vibrant = useDashboardVibrant()

defineProps<{
  columns: Array<{ label: string; field: string; format?: (v: unknown) => string; thClass?: string; tdClass?: string }>
  rows: Record<string, unknown>[]
  emptyMessage?: string
}>()
</script>

<style scoped>
@media print {
  thead {
    display: table-header-group;
  }
  tbody tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
</style>
