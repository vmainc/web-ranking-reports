<template>
  <div class="min-h-[200px] p-4">
    <div v-if="pending" class="text-surface-500">Loading form…</div>
    <div v-else-if="error" class="text-red-600">{{ error }}</div>
    <template v-else-if="schema">
      <FormRenderer :form-id="schema.id" :fields="schema.fields" :conditional="schema.conditional" :success-message="schema.successMessage" :redirect-url="schema.redirectUrl" />
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ auth: false })
const route = useRoute()
const formId = computed(() => route.params.id as string)
const schema = ref<{ id: string; fields: unknown[]; conditional: unknown[]; successMessage?: string; redirectUrl?: string } | null>(null)
const pending = ref(true)
const error = ref('')
async function load() {
  pending.value = true
  error.value = ''
  try {
    schema.value = await $fetch('/api/forms/' + formId.value)
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string }; message?: string })?.data?.message || (e as Error).message || 'Form not found'
    schema.value = null
  } finally {
    pending.value = false
  }
}
onMounted(() => load())
watch(formId, () => load())
</script>
