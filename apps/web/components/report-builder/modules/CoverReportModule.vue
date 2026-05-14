<script setup lang="ts">
import type { ReportModule, ReportBuilderModel } from '~/types/reportBuilder'
import type { Report, SiteRecord } from '~/types'
import { resolveSiteLogoUrl } from '~/utils/siteLogoUrl'
import { WRR_LOGO_PUBLIC_PATH } from '~/utils/wrrReportBranding'

const props = defineProps<{
  module: Extract<ReportModule, { type: 'report_cover' }>
}>()

const model = inject<Ref<ReportBuilderModel | null>>('reportBuilderModel', ref(null))
const site = inject<Ref<SiteRecord | null>>('reportPreviewSite', ref(null))
const workspaceOwnerPlan = inject<Ref<Report['workspaceOwnerPlan'] | null>>('reportWorkspaceOwnerPlan', ref(null))
const pb = usePocketbase()

const tagline = computed(() => props.module.settings.tagline?.trim() || '')

const showLogo = computed(() => props.module.settings.showLogo !== false)

const forceWrrCoverLogo = computed(() => workspaceOwnerPlan.value === 'free')

const siteLogoUrl = computed(() => resolveSiteLogoUrl(site.value, pb))

const resolvedLogoUrl = computed(() => {
  if (forceWrrCoverLogo.value) return WRR_LOGO_PUBLIC_PATH
  if (siteLogoUrl.value) return siteLogoUrl.value
  const override = props.module.settings.logoOverrideUrl?.trim() || ''
  if (override) return override
  const theme = model.value?.theme?.logoUrl?.trim() || ''
  if (theme) return theme
  return ''
})

const hasImageLogo = computed(() => !!resolvedLogoUrl.value)

const generated = computed(() => {
  try {
    return new Date().toLocaleDateString(undefined, { dateStyle: 'long' })
  } catch {
    return ''
  }
})
</script>

<template>
  <div
    class="cover-report-module relative flex min-h-[52vh] flex-col items-center justify-center overflow-hidden rounded-xl border border-surface-100 bg-white px-6 py-14 text-center shadow-sm print:min-h-[70vh] print:border-0 print:bg-white print:shadow-none"
  >
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary-500/[0.07] to-transparent print:hidden"
      aria-hidden="true"
      style="color: var(--report-primary, #2563eb)"
    />

    <div v-if="showLogo" class="relative z-[1] mb-10 flex flex-col items-center gap-3">
      <div
        v-if="hasImageLogo"
        class="flex h-24 w-full max-w-[14rem] items-center justify-center px-2 py-1 print:h-28 print:max-w-[16rem]"
      >
        <img
          :src="resolvedLogoUrl"
          alt=""
          class="max-h-16 w-auto max-w-full object-contain object-center print:max-h-20"
          loading="lazy"
        />
      </div>
      <div
        v-else
        class="flex h-20 min-w-[10rem] items-center justify-center rounded-lg border border-dashed border-surface-300 bg-surface-50 px-4 print:h-24"
        aria-hidden="true"
      >
        <span class="text-xs font-medium text-surface-500">No site logo</span>
      </div>
      <p
        v-if="!hasImageLogo && !forceWrrCoverLogo"
        class="max-w-xs text-[11px] font-medium leading-snug text-surface-500 print:hidden"
      >
        Upload a logo in this cover block or Site Settings to show it here.
      </p>
    </div>

    <div class="relative z-[1] max-w-2xl">
      <p v-if="tagline" class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-surface-500">{{ tagline }}</p>
      <h2 class="text-3xl font-bold tracking-tight text-surface-900 print:text-4xl">
        {{ model?.title || 'Report title' }}
      </h2>
      <p v-if="model?.subtitle" class="mt-4 text-base leading-relaxed text-surface-600">{{ model.subtitle }}</p>
    </div>

    <div class="relative z-[1] mt-12 w-full max-w-md border-t border-surface-200/80 pt-8">
      <p v-if="site?.name" class="text-lg font-semibold text-surface-900">{{ site.name }}</p>
      <p v-if="site?.domain" class="mt-1 text-sm text-surface-500">{{ site.domain }}</p>
      <p v-if="generated" class="mt-6 text-sm text-surface-500">{{ generated }}</p>
    </div>
  </div>
</template>
