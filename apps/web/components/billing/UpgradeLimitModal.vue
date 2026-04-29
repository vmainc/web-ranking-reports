<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="$emit('close')"
    >
      <div class="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-6 shadow-xl">
        <h3 class="text-lg font-semibold text-surface-900">{{ title }}</h3>
        <p class="mt-2 text-sm text-surface-600">{{ message }}</p>
        <div class="mt-4 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
            @click="$emit('upgrade')"
          >
            Upgrade now
          </button>
          <button
            type="button"
            class="rounded-lg border border-surface-200 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50"
            @click="$emit('close')"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ open: boolean; title: string; message: string }>()
defineEmits<{ close: []; upgrade: [] }>()
</script>

