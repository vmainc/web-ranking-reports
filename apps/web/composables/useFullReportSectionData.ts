import { useGoogleIntegration } from '~/composables/useGoogleIntegration'
import type { ReportSectionId } from '~/utils/reportLayoutPresets'

type LighthousePayload = { categories?: Record<string, { id?: string; title?: string; score?: number }> } | null

type WooTopProduct = { id: number; name: string; quantity: number; revenue: number }

type RankKwRow = {
  id: string
  keyword: string
  search_volume?: number | null
  last_result_json?: { position?: number } | null
}

type BacklinksReportPayload = {
  target: string
  fetchedAt: string
  costs?: Partial<Record<string, number>>
  errors?: Partial<Record<string, string>>
  summary: Record<string, unknown> | null
  referringDomains: Array<{ domain?: string; rank?: number; backlinks?: number }>
}

function dateRangeToStartEnd(range: string): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  if (range === 'last_7_days') start.setDate(end.getDate() - 6)
  else if (range === 'last_90_days') start.setDate(end.getDate() - 89)
  else start.setDate(end.getDate() - 27)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

function authHeaders(pb: ReturnType<typeof usePocketbase>): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const GA_SECTIONS = new Set<string>([
  'performance-summary',
  'sessions-trend',
  'traffic-channels',
  'retention',
  'top-countries',
  'top-pages',
  'landing-pages',
  'top-events',
  'ecommerce',
])

/**
 * Loads Google / Ads / Woo / GSC / Lighthouse / audit / rank / backlinks data for a single
 * classic full-report section (used by the visual report builder preview).
 */
export function useFullReportSectionData(opts: {
  siteId: () => string | null | undefined
  sectionId: () => ReportSectionId
  rangePreset: () => string
  compareToPrevious: () => boolean
}) {
  const pb = usePocketbase()
  const { getStatus } = useGoogleIntegration()

  const googleStatus = ref<Awaited<ReturnType<typeof getStatus>> | null>(null)
  const wooReport = ref<{
    totalRevenue: number
    totalOrders: number
    startDate: string
    endDate: string
    revenueByDay?: unknown[]
    topProducts?: WooTopProduct[]
  } | null>(null)
  const wooLoading = ref(false)
  const wooConfigured = ref(false)
  const gscSummary = ref<{ clicks: number; impressions: number; ctr: number; position: number } | null>(null)
  const gscLoading = ref(false)
  const lighthouseMobile = ref<LighthousePayload>(null)
  const lighthouseDesktop = ref<LighthousePayload>(null)
  const auditResult = ref<{ summary: string; url: string; fetchedAt: string; issues: Array<{ severity?: string }> } | null>(
    null,
  )
  const rankKeywords = ref<RankKwRow[]>([])
  const rankKeywordsLoading = ref(false)
  const backlinksData = ref<BacklinksReportPayload | null>(null)
  const backlinksLoading = ref(false)
  const pending = ref(false)

  const hasGa = computed(() => googleStatus.value?.connected && googleStatus.value?.selectedProperty)
  const hasAds = computed(() => !!googleStatus.value?.connected && !!googleStatus.value?.selectedAdsCustomer)
  const hasGsc = computed(() => !!googleStatus.value?.connected && !!googleStatus.value?.selectedSearchConsoleSite)

  const comparePreset = computed(() => (opts.compareToPrevious() ? 'previous_period' : 'none'))

  async function loadGoogle() {
    const sid = opts.siteId()
    if (!sid) {
      googleStatus.value = null
      return
    }
    googleStatus.value = await getStatus(sid).catch(() => null)
  }

  async function loadWoo() {
    const sid = opts.siteId()
    if (!sid) return
    wooLoading.value = true
    wooConfigured.value = false
    wooReport.value = null
    try {
      const wooRes = await $fetch<{ configured: boolean }>('/api/woocommerce/config', {
        headers: authHeaders(pb),
        query: { siteId: sid },
      }).catch(() => ({ configured: false }))
      wooConfigured.value = wooRes?.configured ?? false
      if (wooConfigured.value) {
        const { startDate, endDate } = dateRangeToStartEnd(opts.rangePreset())
        const woo = await $fetch<typeof wooReport.value>('/api/woocommerce/report', {
          headers: authHeaders(pb),
          query: { siteId: sid, startDate, endDate },
        }).catch(() => null)
        wooReport.value = woo
      }
    } finally {
      wooLoading.value = false
    }
  }

  async function loadGsc() {
    const sid = opts.siteId()
    if (!sid || !hasGsc.value) {
      gscSummary.value = null
      return
    }
    gscLoading.value = true
    try {
      const { startDate, endDate } = dateRangeToStartEnd(opts.rangePreset())
      const gsc = await $fetch<{ summary?: { clicks: number; impressions: number; ctr: number; position: number } }>(
        '/api/google/search-console/report',
        {
          headers: authHeaders(pb),
          query: { siteId: sid, dimension: 'date', startDate, endDate },
        },
      ).catch(() => null)
      gscSummary.value = gsc?.summary ?? null
    } finally {
      gscLoading.value = false
    }
  }

  async function loadLighthouse() {
    const sid = opts.siteId()
    if (!sid) return
    const [lm, ld] = await Promise.all([
      $fetch<LighthousePayload>('/api/lighthouse/report', {
        headers: authHeaders(pb),
        query: { siteId: sid, strategy: 'mobile' },
      }).catch(() => null),
      $fetch<LighthousePayload>('/api/lighthouse/report', {
        headers: authHeaders(pb),
        query: { siteId: sid, strategy: 'desktop' },
      }).catch(() => null),
    ])
    lighthouseMobile.value = lm
    lighthouseDesktop.value = ld
  }

  async function loadAudit() {
    const sid = opts.siteId()
    if (!sid) return
    const audit = (await $fetch(`/api/site-audit/${sid}`, {
      headers: authHeaders(pb),
    }).catch(() => ({}))) as { result?: typeof auditResult.value }
    auditResult.value = audit?.result ?? null
  }

  async function loadRank() {
    const sid = opts.siteId()
    if (!sid) return
    rankKeywordsLoading.value = true
    try {
      const rank = await $fetch<{ keywords: RankKwRow[] }>(`/api/sites/${sid}/rank-tracking/list`, {
        headers: authHeaders(pb),
      }).catch(() => ({ keywords: [] }))
      rankKeywords.value = rank?.keywords ?? []
    } finally {
      rankKeywordsLoading.value = false
    }
  }

  async function loadBacklinks() {
    const sid = opts.siteId()
    if (!sid) return
    backlinksLoading.value = true
    try {
      const bl = await $fetch<BacklinksReportPayload | null>(`/api/sites/${sid}/backlinks/latest`, {
        headers: authHeaders(pb),
      }).catch(() => null)
      backlinksData.value =
        bl && typeof bl === 'object' && typeof (bl as BacklinksReportPayload).target === 'string'
          ? (bl as BacklinksReportPayload)
          : null
    } finally {
      backlinksLoading.value = false
    }
  }

  async function refreshForSection() {
    const sid = opts.siteId()
    const sec = opts.sectionId()
    pending.value = true
    try {
      if (!sid) {
        googleStatus.value = null
        wooReport.value = null
        gscSummary.value = null
        lighthouseMobile.value = null
        lighthouseDesktop.value = null
        auditResult.value = null
        rankKeywords.value = []
        backlinksData.value = null
        return
      }
      await loadGoogle()

      const tasks: Promise<void>[] = []
      if (GA_SECTIONS.has(sec) || sec === 'google-ads') {
        /* google status already loaded */
      }
      if (sec === 'woocommerce') tasks.push(loadWoo())
      if (sec === 'search-console') tasks.push(loadGsc())
      if (sec === 'lighthouse') tasks.push(loadLighthouse())
      if (sec === 'site-audit') tasks.push(loadAudit())
      if (sec === 'rank-tracking') tasks.push(loadRank())
      if (sec === 'backlinks') tasks.push(loadBacklinks())
      await Promise.all(tasks)
    } finally {
      pending.value = false
    }
  }

  watch(
    () => [opts.siteId(), opts.sectionId(), opts.rangePreset(), opts.compareToPrevious()] as const,
    () => {
      void refreshForSection()
    },
    { immediate: true },
  )

  return {
    pending,
    googleStatus,
    hasGa,
    hasAds,
    hasGsc,
    comparePreset,
    wooReport,
    wooLoading,
    wooConfigured,
    gscSummary,
    gscLoading,
    lighthouseMobile,
    lighthouseDesktop,
    auditResult,
    rankKeywords,
    rankKeywordsLoading,
    backlinksData,
    backlinksLoading,
    refreshForSection,
  }
}
