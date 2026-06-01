<script setup lang="ts">
import type { ReportModule } from '~/types/reportBuilder'
import type { BacklinksProfile } from '~/types/backlinks'

const props = defineProps<{
  module: Extract<ReportModule, { type: 'backlinks' }>
}>()

const siteIdRef = inject<Ref<string | null>>('reportBuilderSiteId', ref(null))
const siteId = computed(() => siteIdRef.value)

const { loadLatest } = useBacklinksProfile()

const loading = ref(false)
const error = ref('')
const data = ref<BacklinksProfile | null>(null)

async function load() {
  error.value = ''
  data.value = null
  if (!siteId.value) {
    error.value = 'Select a site to load backlink data.'
    return
  }
  loading.value = true
  try {
    const opts = props.module.settings.autoRefresh
      ? { fetchIfMissing: true, maxAgeDays: props.module.settings.maxAgeDays }
      : {}
    data.value = await loadLatest(siteId.value, opts)
    if (!data.value && props.module.settings.autoRefresh) {
      error.value = 'No backlink data returned. Check DataForSEO credentials and site domain.'
    } else if (!data.value) {
      error.value = ''
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message ?? (e instanceof Error ? e.message : String(e)) ?? 'Failed to load backlinks.'
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())

watch(
  () => [siteId.value, props.module.settings.autoRefresh, props.module.settings.maxAgeDays] as const,
  () => void load(),
)
</script>

<template>
  <BacklinksProfilePanel
    :data="data"
    :loading="loading"
    :error="error"
    :compact="false"
    empty-hint="No backlink profile yet. Enable “Refresh from DataForSEO when needed” in block settings, or load data on the site Backlinks page."
  />
</template>
