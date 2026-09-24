<template>
  <div class="mx-auto w-full max-w-[100vw] px-4 py-8 sm:px-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-white">Leads board</h1>
      <p class="mt-1 text-sm text-slate-400">
        Shared with your whole team — add columns and cards like Trello.
      </p>
    </div>

    <CrmSubNav />
    <CrmPipelineBoard />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>
