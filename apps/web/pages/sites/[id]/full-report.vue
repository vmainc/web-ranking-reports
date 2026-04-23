<script setup lang="ts">
import { buildWeeklySnapshotSections, LAYOUT_TEMPLATE_WEEKLY_SNAPSHOT } from '~/utils/reportLayoutPresets'
import { getSite } from '~/services/sites'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const pb = usePocketbase()

const siteId = computed(() => String(route.params.id || ''))

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function forwardPdfTokenQuery(): Record<string, string> {
  const q = route.query as Record<string, unknown>
  const out: Record<string, string> = {}
  if (typeof q.pdf_token === 'string' && q.pdf_token) out.pdf_token = q.pdf_token
  return out
}

onMounted(async () => {
  const sid = siteId.value
  if (!sid) {
    await navigateTo('/dashboard', { replace: true })
    return
  }

  const pdfToken = typeof route.query.pdf_token === 'string' && route.query.pdf_token ? route.query.pdf_token : ''
  const pdfGuest = !!pdfToken && !pb.authStore.token

  if (!pdfGuest && !pb.authStore.token) {
    await navigateTo({ path: '/login', query: { redirect: route.fullPath } }, { replace: true })
    return
  }

  const ridRaw = route.query.reportId
  if (typeof ridRaw === 'string' && ridRaw.trim()) {
    await navigateTo(
      { path: `/reports/${ridRaw.trim()}/preview`, query: forwardPdfTokenQuery() },
      { replace: true },
    )
    return
  }

  if (pdfGuest) {
    await navigateTo(`/sites/${sid}`, { replace: true })
    return
  }

  if (route.query.preset === 'weekly_snapshot') {
    try {
      const woo = (useRuntimeConfig().public as { woocommerceEnabled?: boolean }).woocommerceEnabled !== false
      const { report } = await $fetch<{ report: { id: string } }>('/api/reports/create', {
        method: 'POST',
        headers: authHeaders(),
        body: { siteId: sid },
      })
      const site = await getSite(pb, sid)
      const defaultName = site ? `Weekly Snapshot – ${site.name}` : 'Weekly Snapshot'
      await $fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: {
          payload_json: {
            name: defaultName,
            layoutTemplateKey: LAYOUT_TEMPLATE_WEEKLY_SNAPSHOT,
            sections: buildWeeklySnapshotSections(woo),
            rangePreset: 'last_7_days',
            comparePreset: 'previous_period',
          },
        },
      })
      await navigateTo(
        {
          path: `/reports/${report.id}/preview`,
          query: { range: 'last_7_days', compare: 'previous_period' },
        },
        { replace: true },
      )
    } catch {
      await navigateTo(`/sites/${sid}`, { replace: true })
    }
    return
  }

  await navigateTo(`/sites/${sid}`, { replace: true })
})
</script>

<template>
  <div
    class="full-report-redirect-root flex min-h-[40vh] flex-col items-center justify-center gap-2 px-4 py-16 text-sm text-surface-600"
  >
    <p>Redirecting…</p>
  </div>
</template>

<style scoped>
.full-report-redirect-root {
  box-sizing: border-box;
}
</style>
