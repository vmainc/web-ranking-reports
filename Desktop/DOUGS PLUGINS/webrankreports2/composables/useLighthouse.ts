import { ref, computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useRuntimeConfig, useNuxtApp } from '#app'

export interface LighthouseScores {
  overall: number | null
  performance: number | null
  accessibility: number | null
  bestPractices: number | null
  seo: number | null
  pwa: number | null
}

export interface LighthouseMetrics {
  fcpMs: number | null
  lcpMs: number | null
  cls: number | null
  tbtMs: number | null
}

export interface LighthouseScreenshotFrame {
  data: string
  timing: number | null
}

export interface LighthouseScreenshots {
  final: string | null
  loadingSequence: LighthouseScreenshotFrame[]
}

export interface LighthouseAuditItem {
  id: string
  title: string
  description: string
  displayValue?: string
}

export interface LighthouseCategoryAudits {
  errors: LighthouseAuditItem[]
  passed: LighthouseAuditItem[]
}

export interface LighthouseCategoryAuditsMap {
  performance: LighthouseCategoryAudits
  accessibility: LighthouseCategoryAudits
  bestPractices: LighthouseCategoryAudits
  seo: LighthouseCategoryAudits
}

export const useLighthouse = (siteId: MaybeRefOrGetter<string | number | null | undefined>) => {
  const scores = ref<LighthouseScores | null>(null)
  const metrics = ref<LighthouseMetrics | null>(null)
  const screenshots = ref<LighthouseScreenshots | null>(null)
  const categoryAudits = ref<LighthouseCategoryAuditsMap | null>(null)
  const strategy = ref<'mobile' | 'desktop'>('mobile')
  const latestRunAt = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const nuxtApp = useNuxtApp()
  const $supabase = nuxtApp.$supabase
  const runtimeConfig = useRuntimeConfig()
  const functionsBaseUrl = runtimeConfig.public.supabaseFunctionsUrl as string

  const loadLatestAudit = async (strat: 'mobile' | 'desktop' = 'mobile') => {
    loading.value = true
    error.value = null

    try {
      const site = String(toValue(siteId) ?? '').trim()
      if (!site) {
        throw new Error('Site ID is required')
      }

      if (!functionsBaseUrl) {
        throw new Error('Supabase Functions URL not configured')
      }

      const config = useRuntimeConfig()
      const anonKey = config.public.supabaseAnonKey as string

      // Get session for Authorization header
      const { data: session } = await $supabase.auth.getSession()
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      }

      if (session?.session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.session.access_token}`
      }

      const response = await fetch(
        `${functionsBaseUrl}/lighthouse-run?site_id=${site}&strategy=${strat}`,
        {
          method: 'GET',
          headers: authHeaders,
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          // No audit found - this is OK, just clear state
          scores.value = null
          metrics.value = null
          screenshots.value = null
          categoryAudits.value = null
          latestRunAt.value = null
          strategy.value = strat
          return
        }

        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to load Lighthouse audit.')
      }

      const data = await response.json() as {
        siteId: string
        strategy: 'mobile' | 'desktop'
        fetchedAt: string
        scores: LighthouseScores
        metrics: LighthouseMetrics
        screenshots: LighthouseScreenshots
        categoryAudits?: LighthouseCategoryAuditsMap
      }

      scores.value = data.scores
      metrics.value = data.metrics
      screenshots.value = data.screenshots
      categoryAudits.value = data.categoryAudits || null
      strategy.value = data.strategy
      latestRunAt.value = data.fetchedAt
    } catch (err: any) {
      console.error('Error loading Lighthouse audit:', err)
      error.value = err.message || 'Unable to load Lighthouse audit.'
    } finally {
      loading.value = false
    }
  }

  const runAudit = async (strat: 'mobile' | 'desktop' = 'mobile') => {
    loading.value = true
    error.value = null

    try {
      const site = String(toValue(siteId) ?? '').trim()
      if (!site) {
        throw new Error('Site ID is required')
      }

      if (!functionsBaseUrl) {
        throw new Error('Supabase Functions URL not configured')
      }

      const config = useRuntimeConfig()
      const anonKey = config.public.supabaseAnonKey as string

      // Get session for Authorization header
      const { data: session } = await $supabase.auth.getSession()
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      }

      if (session?.session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.session.access_token}`
      }

      const response = await fetch(`${functionsBaseUrl}/lighthouse-run`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          site_id: site,
          strategy: strat,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to run Lighthouse audit.')
      }

      const data = await response.json() as {
        siteId: string
        strategy: 'mobile' | 'desktop'
        fetchedAt: string
        scores: LighthouseScores
        metrics: LighthouseMetrics
        screenshots: LighthouseScreenshots
        categoryAudits?: LighthouseCategoryAuditsMap
      }

      scores.value = data.scores
      metrics.value = data.metrics
      screenshots.value = data.screenshots
      categoryAudits.value = data.categoryAudits || null
      strategy.value = data.strategy
      latestRunAt.value = data.fetchedAt
    } catch (err: any) {
      console.error('Error running Lighthouse audit:', err)
      error.value = err.message || 'Unable to run Lighthouse audit.'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Computed property for backward compatibility with dashboard
  const latestScore = computed(() => scores.value?.overall ?? null)

  // Wrapper function for backward compatibility with dashboard
  const loadHistory = async (limit?: number) => {
    // The dashboard calls this with a limit, but we just load the latest
    await loadLatestAudit('mobile')
  }

  return {
    scores,
    metrics,
    screenshots,
    categoryAudits,
    strategy,
    latestRunAt,
    loading,
    error,
    loadLatestAudit,
    runAudit,
    // Backward compatibility exports
    latestScore,
    loadHistory,
  }
}
