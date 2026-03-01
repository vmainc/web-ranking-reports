<template>
  <LeadGenerationLayout>
    <div class="max-w-2xl space-y-8">
      <h2 class="text-lg font-semibold text-surface-900">Lead Generation settings</h2>
      <section class="rounded-2xl border border-surface-200 bg-white p-6">
        <h3 class="mb-4 font-medium text-surface-900">Default audit settings</h3>
        <div class="space-y-4">
          <label class="flex items-center gap-2"><input v-model="settings.lighthouseMobile" type="checkbox" class="rounded border-surface-300 text-primary-600" /><span class="text-sm font-medium text-surface-700">Run Lighthouse (mobile)</span></label>
          <label class="flex items-center gap-2"><input v-model="settings.lighthouseDesktop" type="checkbox" class="rounded border-surface-300 text-primary-600" /><span class="text-sm font-medium text-surface-700">Run Lighthouse (desktop)</span></label>
          <div><label class="block text-sm font-medium text-surface-700">Competitors count</label><input v-model.number="settings.competitorsCount" type="number" min="0" max="10" class="mt-1 block w-24 rounded-lg border border-surface-300 px-3 py-2 text-sm" /></div>
          <div><label class="block text-sm font-medium text-surface-700">Keyword depth</label><input v-model.number="settings.keywordDepth" type="number" min="5" max="50" class="mt-1 block w-24 rounded-lg border border-surface-300 px-3 py-2 text-sm" /></div>
        </div>
        <div class="mt-6"><button type="button" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50" :disabled="saving" @click="save">{{ saving ? 'Saving…' : 'Save' }}</button></div>
      </section>
    </div>
  </LeadGenerationLayout>
</template>

<script setup lang="ts">
const route = useRoute()
const pb = usePocketbase()
const siteId = computed(() => route.params.id as string)
const saving = ref(false)
const settings = ref({ lighthouseMobile: true, lighthouseDesktop: true, competitorsCount: 3, keywordDepth: 20 })
function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
async function load() { try { const data = await $fetch<{ settings?: typeof settings.value }>(`/api/sites/${siteId.value}/lead-generation/settings`, { headers: authHeaders() }); if (data.settings) settings.value = { ...settings.value, ...data.settings } } catch {} }
async function save() { saving.value = true; try { await $fetch(`/api/sites/${siteId.value}/lead-generation/settings`, { method: 'POST', headers: authHeaders(), body: settings.value }) } catch { alert('Failed to save') } finally { saving.value = false } }
onMounted(() => load())
</script>
