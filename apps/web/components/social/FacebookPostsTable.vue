<script setup lang="ts">
export type FacebookPostRow = {
  id: string
  publishedAt: string
  message: string
  permalink: string
  mediaUrl: string
  mediaType: string
  reactions: number | null
  comments: number | null
  shares: number | null
  reach: number | null
  views: number | null
  clicks: number | null
}

const props = withDefaults(
  defineProps<{
    posts: FacebookPostRow[]
    compact?: boolean
    emptyText?: string
  }>(),
  { compact: false, emptyText: 'No posts stored for this period yet. Refresh after the next Meta sync.' },
)

function formatInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString()
}

function formatWhen(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function excerpt(message: string): string {
  const t = (message || '').replace(/\s+/g, ' ').trim()
  if (!t) return '(no caption)'
  return t.length > 140 ? `${t.slice(0, 137)}…` : t
}
</script>

<template>
  <div v-if="!posts.length" class="facebook-posts-table px-3 py-4 text-sm text-surface-500">{{ emptyText }}</div>
  <div v-else class="facebook-posts-table overflow-x-auto">
    <table class="min-w-full text-left text-sm">
      <thead>
        <tr class="border-b border-surface-200 bg-surface-50 text-[11px] font-semibold uppercase tracking-wide text-surface-500">
          <th class="py-2.5 pr-3 pl-3 font-semibold">Post</th>
          <th class="py-2.5 px-2 font-semibold">Date</th>
          <th class="py-2.5 px-2 text-right font-semibold">Reach</th>
          <th class="py-2.5 px-2 text-right font-semibold">Reactions</th>
          <th class="py-2.5 px-2 text-right font-semibold">Comments</th>
          <th class="py-2.5 pl-2 pr-3 text-right font-semibold">Shares</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="post in posts" :key="post.id" class="border-b border-surface-100 align-top last:border-0">
          <td class="py-3 pr-3 pl-3">
            <div class="flex gap-3">
              <div
                class="shrink-0 overflow-hidden rounded-md bg-surface-100"
                :class="compact ? 'h-12 w-12' : 'h-14 w-14'"
              >
                <img v-if="post.mediaUrl" :src="post.mediaUrl" alt="" class="h-full w-full object-cover" />
              </div>
              <div class="min-w-0">
                <p class="text-surface-900" :class="compact ? 'text-xs' : 'text-sm'">{{ excerpt(post.message) }}</p>
                <a
                  v-if="post.permalink"
                  :href="post.permalink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="mt-1 inline-block text-[11px] font-medium text-primary-700 hover:underline"
                >
                  View on Facebook
                </a>
              </div>
            </div>
          </td>
          <td class="whitespace-nowrap py-3 px-2 text-surface-600">{{ formatWhen(post.publishedAt) }}</td>
          <td class="whitespace-nowrap py-3 px-2 text-right tabular-nums text-surface-900">{{ formatInt(post.reach) }}</td>
          <td class="whitespace-nowrap py-3 px-2 text-right tabular-nums text-surface-900">{{ formatInt(post.reactions) }}</td>
          <td class="whitespace-nowrap py-3 px-2 text-right tabular-nums text-surface-900">{{ formatInt(post.comments) }}</td>
          <td class="whitespace-nowrap py-3 pl-2 pr-3 text-right tabular-nums text-surface-900">{{ formatInt(post.shares) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
