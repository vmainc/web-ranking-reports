<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'
import type { AiVisibilityProfile } from '~/types/aiVisibility'

const props = defineProps<{
  module: Extract<ReportModule, { type: 'ai_visibility' }>
}>()

const siteIdRef = inject<Ref<string | null>>('reportBuilderSiteId', ref(null))
const siteId = computed(() => siteIdRef.value)

const { loadLatest } = useAiVisibilityProfile()

const loading = ref(false)
const error = ref('')
const data = ref<AiVisibilityProfile | null>(null)

async function load() {
  error.value = ''
  data.value = null
  if (!siteId.value) {
    error.value = 'Select a site to load AI visibility data.'
    return
  }
  loading.value = true
  try {
    const opts = props.module.settings.autoRefresh
      ? {
          fetchIfMissing: true,
          maxAgeDays: props.module.settings.maxAgeDays,
          maxKeywords: props.module.settings.maxKeywords,
        }
      : {}
    data.value = await loadLatest(siteId.value, opts)
    if (!data.value && props.module.settings.autoRefresh) {
      error.value = 'No AI visibility data returned. Check DataForSEO credentials and site domain.'
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? (e instanceof Error ? e.message : String(e)) ?? 'Failed to load AI visibility.'
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())

watch(
  () =>
    [
      siteId.value,
      props.module.settings.autoRefresh,
      props.module.settings.maxAgeDays,
      props.module.settings.maxKeywords,
    ] as const,
  () => void load(),
)
</script>

<template>
  <AiVisibilityPanel
    :data="data"
    :loading="loading"
    :error="error"
    compact
    empty-hint="No AI visibility snapshot yet. Enable “Refresh from DataForSEO when needed” in block settings, or load data on the site AI Visibility page."
  />
</template>
