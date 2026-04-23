<script setup lang="ts">
import type { ReportModule, ReportBuilderModel } from '~/types/reportBuilder'
import type { SiteRecord } from '~/types'
import { resolveSiteLogoUrl } from '~/utils/siteLogoUrl'

const props = defineProps<{
  module: Extract<ReportModule, { type: 'report_cover' }>
}>()

const model = inject<Ref<ReportBuilderModel | null>>('reportBuilderModel', ref(null))
const site = inject<Ref<SiteRecord | null>>('reportPreviewSite', ref(null))
const pb = usePocketbase()

const tagline = computed(() => props.module.settings.tagline?.trim() || '')

const showLogo = computed(() => props.module.settings.showLogo !== false)

const siteLogoUrl = computed(() => resolveSiteLogoUrl(site.value, pb))

const resolvedLogoUrl = computed(() => {
  const override = props.module.settings.logoOverrideUrl?.trim() || ''
  if (override) return override
  const theme = model.value?.theme?.logoUrl?.trim() || ''
  if (theme) return theme
  return siteLogoUrl.value
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
        class="flex h-24 w-24 items-center justify-center rounded-2xl border border-surface-200/80 bg-white shadow-sm ring-4 ring-primary-500/10 print:h-28 print:w-28"
        aria-hidden="true"
      >
        <div
          class="flex h-16 w-16 items-center justify-center rounded-xl text-white shadow-inner print:h-[4.5rem] print:w-[4.5rem]"
          style="background: linear-gradient(145deg, var(--report-primary, #2563eb), color-mix(in srgb, var(--report-primary, #2563eb) 70%, #0f172a))"
        >
          <svg class="h-9 w-9 opacity-95 print:h-10 print:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.25">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6v12m-4-4h8M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z"
            />
          </svg>
        </div>
      </div>
      <p v-if="!hasImageLogo" class="max-w-xs text-[11px] font-medium leading-snug text-surface-500 print:hidden">
        Add a logo in report settings, site settings, or this block’s override URL — or keep this mark.
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
