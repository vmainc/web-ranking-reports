<script setup lang="ts">
import type { ReportBuilderModel } from '~/types/reportBuilder'
import {
  buildDeliveryEmailHtml,
  deliveryEmailBodyToHtml,
  DELIVERY_EMAIL_TOKENS,
  renderDeliveryEmailTokens,
} from '~/utils/reportDeliveryEmail'

const props = defineProps<{
  model: ReportBuilderModel
  siteName: string
}>()

const emit = defineEmits<{
  update: [patch: Partial<ReportBuilderModel['deliveryEmail']>]
}>()

const { colors: agencyColors, load: loadAgencyBranding } = useAgencyReportBranding()

const agencyLogoUrl = ref('')
const agencyName = ref('')

onMounted(async () => {
  await loadAgencyBranding()
  try {
    const res = await $fetch<{ name?: string; hasCustomLogo?: boolean }>('/api/agency/branding')
    agencyName.value = res.name?.trim() || 'Your agency'
    agencyLogoUrl.value = res.hasCustomLogo ? '/api/agency/logo' : ''
  } catch {
    agencyName.value = 'Your agency'
  }
})

const previewVars = computed(() => ({
  site: props.siteName.trim() || 'Client site',
  date: new Date().toLocaleDateString(undefined, { dateStyle: 'medium' }),
  reportTitle: props.model.title.trim() || 'Report',
}))

const previewSubject = computed(() =>
  renderDeliveryEmailTokens(props.model.deliveryEmail.subject, previewVars.value),
)

const effectiveLogoUrl = computed(() => {
  const de = props.model.deliveryEmail.logoUrl.trim()
  if (de) return de
  const theme = props.model.theme.logoUrl?.trim()
  if (theme) return theme
  return agencyLogoUrl.value
})

const previewHtml = computed(() => {
  const bodyRendered = renderDeliveryEmailTokens(props.model.deliveryEmail.body, previewVars.value)
  return buildDeliveryEmailHtml({
    bodyHtml: deliveryEmailBodyToHtml(bodyRendered),
    logoUrl: effectiveLogoUrl.value || undefined,
    showLogo: props.model.deliveryEmail.showLogo,
    showOpenLink: props.model.deliveryEmail.showOpenLink,
    openReportUrl: 'https://example.com/report-preview',
    primaryColor: agencyColors.value?.primary,
    appName: agencyName.value || 'Web Ranking Reports',
  })
})

const tokenHint = DELIVERY_EMAIL_TOKENS.map((t) => `{{${t}}}`).join(', ')
</script>

<template>
  <div class="border-t border-surface-200 pt-5">
    <div>
      <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Client email</h2>
      <p class="mt-1 text-xs text-surface-500">
        Message sent with the PDF when you email this report or when an automated schedule uses this layout.
      </p>
    </div>

    <label class="mt-4 block">
      <span class="text-xs font-medium text-surface-700">Email subject</span>
      <input
        :value="model.deliveryEmail.subject"
        type="text"
        maxlength="200"
        class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        placeholder="{{reportTitle}}"
        @input="emit('update', { subject: ($event.target as HTMLInputElement).value })"
      />
      <p class="mt-1 text-[11px] text-surface-500">Tokens: {{ tokenHint }}</p>
    </label>

    <label class="mt-3 block">
      <span class="text-xs font-medium text-surface-700">Email logo URL</span>
      <input
        :value="model.deliveryEmail.logoUrl"
        type="url"
        class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        placeholder="Leave blank to use report logo or agency logo"
        @input="emit('update', { logoUrl: ($event.target as HTMLInputElement).value })"
      />
    </label>

    <div class="mt-3 flex flex-col gap-2">
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="model.deliveryEmail.showLogo"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('update', { showLogo: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Show logo in email</span>
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input
          :checked="model.deliveryEmail.showOpenLink"
          type="checkbox"
          class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          @change="emit('update', { showOpenLink: ($event.target as HTMLInputElement).checked })"
        />
        <span class="text-sm text-surface-800">Include “Open report” button (scheduled sends)</span>
      </label>
    </div>

    <label class="mt-3 block">
      <span class="text-xs font-medium text-surface-700">Email message</span>
      <textarea
        :value="model.deliveryEmail.body"
        rows="6"
        class="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        placeholder="Hi,&#10;&#10;Your report is attached…"
        @input="emit('update', { body: ($event.target as HTMLTextAreaElement).value })"
      />
      <p class="mt-1 text-[11px] text-surface-500">Blank lines start new paragraphs. Same tokens as the subject.</p>
    </label>

    <div class="mt-4">
      <p class="mb-2 text-xs font-medium text-surface-700">Preview</p>
      <div class="overflow-hidden rounded-lg border border-surface-200 bg-slate-100">
        <div class="border-b border-surface-200 bg-white px-3 py-2">
          <p class="text-[10px] font-medium uppercase tracking-wide text-surface-400">Subject</p>
          <p class="truncate text-sm font-medium text-surface-900">{{ previewSubject || '—' }}</p>
        </div>
        <div class="bg-white p-4">
          <p class="mb-2 text-[10px] text-surface-400">PDF attachment shown separately in the real email</p>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="rounded border border-surface-100 bg-surface-50/80 p-3 text-[15px]" v-html="previewHtml" />
        </div>
      </div>
    </div>
  </div>
</template>
