<template>
  <article
    class="relative rounded-2xl border bg-white p-5 shadow-sm"
    :class="[
      highlighted ? 'border-primary-400 ring-2 ring-primary-100' : 'border-surface-200',
      isCurrent ? 'opacity-95' : '',
    ]"
  >
    <span
      v-if="ribbon"
      class="absolute -top-3 left-4 rounded-full bg-primary-600 px-2.5 py-1 text-[11px] font-semibold text-white"
    >
      {{ ribbon }}
    </span>
    <p class="text-sm font-semibold text-surface-900">{{ title }}</p>
    <p class="mt-1 text-2xl font-bold text-surface-900">{{ price }}</p>
    <p class="mt-1 text-xs text-surface-500">{{ subtitle }}</p>
    <ul class="mt-4 space-y-1.5 text-sm text-surface-700">
      <li v-for="f in features" :key="f">• {{ f }}</li>
    </ul>
    <p v-if="note" class="mt-3 text-xs text-surface-500">{{ note }}</p>
    <button
      type="button"
      class="mt-4 w-full rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
      :class="isCurrent ? 'border border-surface-200 text-surface-600' : 'bg-primary-600 text-white hover:bg-primary-500'"
      :disabled="isCurrent || busy"
      @click="$emit('upgrade')"
    >
      {{ isCurrent ? 'Current plan' : busy ? 'Redirecting…' : cta }}
    </button>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  price: string
  subtitle: string
  features: string[]
  cta: string
  isCurrent?: boolean
  highlighted?: boolean
  ribbon?: string
  note?: string
  busy?: boolean
}>()
defineEmits<{ upgrade: [] }>()
</script>

