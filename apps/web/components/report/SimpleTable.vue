<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-surface-200 text-left text-sm">
      <thead class="bg-surface-50">
        <tr>
          <th
            v-for="(col, i) in columns"
            :key="i"
            class="px-4 py-2 font-medium text-surface-700"
            :class="col.thClass"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-surface-200">
        <tr v-for="(row, ri) in rows" :key="ri" class="hover:bg-surface-50/50">
          <td
            v-for="(col, ci) in columns"
            :key="ci"
            class="px-4 py-2 text-surface-600"
            :class="col.tdClass"
          >
            {{ col.format ? col.format(row[col.field]) : row[col.field] }}
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="emptyMessage && (!rows || rows.length === 0)" class="py-6 text-center text-sm text-surface-500">
      {{ emptyMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  columns: Array<{ label: string; field: string; format?: (v: unknown) => string; thClass?: string; tdClass?: string }>
  rows: Record<string, unknown>[]
  emptyMessage?: string
}>()
</script>
