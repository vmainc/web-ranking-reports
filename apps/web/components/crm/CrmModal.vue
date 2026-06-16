<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="$emit('update:modelValue', false)"
    >
      <div
        class="app-light-surface flex max-h-[min(90vh,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        :class="contentClass"
        @click.stop
      >
        <div v-if="$slots.title || title" class="shrink-0 border-b border-surface-200 px-6 py-4">
          <slot name="title">
            <h3 class="text-lg font-semibold text-surface-900">{{ title }}</h3>
          </slot>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <slot />
        </div>
        <div v-if="$slots.footer" class="shrink-0 border-t border-surface-200 px-6 py-4">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
  title?: string
  contentClass?: string
}>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>
