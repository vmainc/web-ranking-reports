<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="$emit('update:modelValue', false)"
    >
      <div
        class="w-full max-w-lg rounded-xl bg-white shadow-xl"
        :class="contentClass"
        @click.stop
      >
        <div v-if="$slots.title || title" class="border-b border-surface-200 px-6 py-4">
          <slot name="title">
            <h3 class="text-lg font-semibold text-surface-900">{{ title }}</h3>
          </slot>
        </div>
        <div class="px-6 py-4">
          <slot />
        </div>
        <div v-if="$slots.footer" class="border-t border-surface-200 px-6 py-4">
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
