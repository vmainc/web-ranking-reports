<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/50 p-4"
      @click.self="close"
    >
      <div
        class="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-6 shadow-xl"
        role="dialog"
        aria-labelledby="add-site-title"
      >
        <h2 id="add-site-title" class="text-lg font-semibold text-surface-900">Add Site</h2>
        <p class="mt-1 text-sm text-surface-500">Add a site by name and domain to start connecting integrations.</p>

        <form class="mt-6 space-y-4" @submit.prevent="submit">
          <div>
            <label for="site-name" class="mb-1 block text-sm font-medium text-surface-700">Name</label>
            <input
              id="site-name"
              v-model="name"
              type="text"
              required
              class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="My Website"
            />
          </div>
          <div>
            <label for="site-domain" class="mb-1 block text-sm font-medium text-surface-700">Domain</label>
            <input
              id="site-domain"
              v-model="domain"
              type="text"
              required
              class="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-surface-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="example.com"
            />
          </div>
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              class="flex-1 rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-50"
              @click="close"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
            >
              {{ loading ? 'Adding…' : 'Add Site' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { createSite } from '~/services/sites'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'saved'])

const pb = usePocketbase()
const name = ref('')
const domain = ref('')
const error = ref('')
const loading = ref(false)

function close() {
  if (!loading.value) {
    emit('update:modelValue', false)
    name.value = ''
    domain.value = ''
    error.value = ''
  }
}

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const created = await createSite(pb, { name: name.value.trim(), domain: domain.value.trim() })
    close()
    emit('saved', created.id)
  } catch (e: unknown) {
    const err = e as { message?: string }
    error.value = err?.message ?? 'Failed to add site.'
  } finally {
    loading.value = false
  }
}

watch(() => props.modelValue, (open) => {
  if (!open) {
    name.value = ''
    domain.value = ''
    error.value = ''
  }
})
</script>
