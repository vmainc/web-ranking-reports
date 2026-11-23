<template>
  <div class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 class="text-sm font-semibold text-surface-900">Start from template</h2>
        <p class="mt-0.5 text-xs text-surface-500">
          Pre-filled subject, body, and suggested audience. You can edit everything before sending.
        </p>
      </div>
      <button
        v-if="selectedId"
        type="button"
        class="text-xs font-medium text-surface-600 hover:text-surface-900"
        @click="clearSelection"
      >
        Clear template
      </button>
    </div>
    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <button
        v-for="t in templates"
        :key="t.id"
        type="button"
        class="rounded-lg border px-3 py-3 text-left transition"
        :class="
          selectedId === t.id
            ? 'border-primary-400 bg-primary-50/80 ring-1 ring-primary-200'
            : 'border-surface-200 bg-surface-50/50 hover:border-surface-300 hover:bg-surface-50'
        "
        @click="select(t)"
      >
        <span class="block text-sm font-semibold text-surface-900">{{ t.name }}</span>
        <span class="mt-1 block text-xs text-surface-600">{{ t.description }}</span>
        <span class="mt-2 block text-[11px] font-medium text-surface-500">
          Audience:
          <template v-if="t.recipientMode === 'tag'">Tag &ldquo;{{ t.tag }}&rdquo;</template>
          <template v-else-if="t.recipientMode === 'site'">By site</template>
          <template v-else>All contacts</template>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  EMAIL_CAMPAIGN_STARTER_TEMPLATES,
  type EmailCampaignStarterTemplate,
} from '~/utils/emailCampaignStarterTemplates'

const emit = defineEmits<{
  apply: [template: EmailCampaignStarterTemplate]
}>()

const props = defineProps<{
  /** Pre-select when opened via ?template= */
  initialTemplateId?: string
}>()

const templates = EMAIL_CAMPAIGN_STARTER_TEMPLATES
const selectedId = ref<string | null>(null)

function select(t: EmailCampaignStarterTemplate) {
  selectedId.value = t.id
  emit('apply', substituteQuarter(t))
}

function clearSelection() {
  selectedId.value = null
}

function substituteQuarter(t: EmailCampaignStarterTemplate): EmailCampaignStarterTemplate {
  const q = Math.ceil((new Date().getMonth() + 1) / 3)
  return {
    ...t,
    subject: t.subject.replace(/\{\{quarter\}\}/g, String(q)),
    campaignName: t.campaignName.replace(/\{\{quarter\}\}/g, String(q)),
  }
}

onMounted(() => {
  const id = props.initialTemplateId?.trim()
  if (!id) return
  const t = templates.find((x) => x.id === id.toLowerCase())
  if (t) select(t)
})
</script>