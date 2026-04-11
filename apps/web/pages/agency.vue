<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="mb-8">
      <NuxtLink to="/dashboard" class="text-sm font-medium text-surface-600 hover:text-primary-600">← Dashboard</NuxtLink>
      <h1 class="mt-4 text-2xl font-semibold text-surface-900">Agency Planner</h1>
      <p class="mt-1 text-sm text-surface-500">AI-powered goals and execution plans for digital marketing agencies.</p>
    </div>

    <div v-if="generating" class="mb-6 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900">
      Building your plan…
    </div>

    <p v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{{ error }}</p>
    <p v-if="saveMessage" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{{ saveMessage }}</p>

    <div class="grid gap-8 lg:grid-cols-2 lg:items-start">
      <agency-form :form="form" :generating="generating" :has-plan="!!plan" @generate="runGenerate" @regenerate="runGenerate" />
      <agency-results
        v-model:selected-site-id="selectedSiteId"
        :plan="plan"
        :sites="sites"
        :saving="saving"
        :adding-todos="addingTodos"
        @save="savePlan"
        @add-todos="onAddTodos"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const {
  form,
  plan,
  generating,
  saving,
  addingTodos,
  error,
  saveMessage,
  sites,
  selectedSiteId,
  loadSites,
  generate,
  savePlan,
  addToTodos,
} = useAgencyPlanner()

onMounted(() => {
  void loadSites()
})

async function runGenerate() {
  await generate()
}

async function onAddTodos(payload: { siteId: string; includeQuickWins: boolean }) {
  selectedSiteId.value = payload.siteId
  await addToTodos(payload.includeQuickWins)
}
</script>
