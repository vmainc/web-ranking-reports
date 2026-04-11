<template>
  <div class="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
    <div v-if="pending" class="px-6 py-12 text-center text-sm text-surface-500">Loading campaigns…</div>
    <div v-else-if="!campaigns.length" class="px-6 py-12 text-center text-sm text-surface-500">No campaigns yet.</div>
    <table v-else class="min-w-full divide-y divide-surface-200 text-sm">
      <thead class="bg-surface-50">
        <tr>
          <th class="px-4 py-3 text-left font-medium text-surface-700">Name</th>
          <th class="px-4 py-3 text-left font-medium text-surface-700">Status</th>
          <th class="px-4 py-3 text-right font-medium text-surface-700">Recipients</th>
          <th class="px-4 py-3 text-left font-medium text-surface-700">Sent</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-surface-200">
        <tr v-for="c in campaigns" :key="c.id" class="hover:bg-surface-50/80">
          <td class="px-4 py-3 font-medium text-surface-900">{{ c.name }}</td>
          <td class="px-4 py-3 text-surface-600">
            <span class="inline-flex rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium capitalize text-surface-800">
              {{ statusLabel(c) }}
            </span>
          </td>
          <td class="px-4 py-3 text-right tabular-nums text-surface-700">{{ c.recipientCount }}</td>
          <td class="px-4 py-3 text-surface-600">{{ sentLabel(c) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { EmailCampaignListItem } from '~/types'

defineProps<{
  campaigns: EmailCampaignListItem[]
  pending?: boolean
}>()

function statusLabel(c: EmailCampaignListItem): string {
  if (c.status === 'scheduled' && c.send_at) {
    try {
      const d = new Date(c.send_at)
      if (!Number.isNaN(d.getTime())) return `Scheduled · ${d.toLocaleString()}`
    } catch {
      // fall through
    }
  }
  return c.status
}

function sentLabel(c: EmailCampaignListItem): string {
  if (c.status === 'sent' && c.sent_at) {
    try {
      return new Date(c.sent_at).toLocaleString()
    } catch {
      return '—'
    }
  }
  if (c.status === 'sending') return 'In progress…'
  return '—'
}
</script>
