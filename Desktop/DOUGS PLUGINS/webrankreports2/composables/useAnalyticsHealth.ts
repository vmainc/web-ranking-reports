import { computed, ref, type MaybeRefOrGetter, toValue } from 'vue'

export interface HealthMessage {
  type: string
  message: string
}

export interface HealthSnapshot {
  id: number
  site_id: string
  overall_score: number
  tracking_score: number
  traffic_score: number
  content_score: number
  ux_score: number
  audience_score: number
  critical_alerts: HealthMessage[]
  warnings: HealthMessage[]
  insights: HealthMessage[]
  period_start: string
  period_end: string
  created_at: string
}

export interface HealthHistoryPoint {
  created_at: string
  overall_score: number
}

export const useAnalyticsHealth = (siteId: MaybeRefOrGetter<string | number | null | undefined>) => {
  const nuxtApp = useNuxtApp()
  const $supabase = nuxtApp.$supabase
  const config = useRuntimeConfig()

  const resolvedId = computed(() => String(toValue(siteId) ?? '').trim())

  const current = ref<HealthSnapshot | null>(null)
  const history = ref<HealthHistoryPoint[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Load history from database
  const loadHistory = async () => {
    if (!resolvedId.value) return

    if (!$supabase) {
      throw new Error('Supabase client is not available')
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: supabaseError } = await $supabase
        .from('analytics_health')
        .select('*')
        .eq('site_id', resolvedId.value)
        .order('created_at', { ascending: false })
        .limit(20)

      if (supabaseError) {
        throw supabaseError
      }

      if (data && data.length > 0) {
        // Set current to the most recent snapshot
        current.value = data[0] as HealthSnapshot

        // Map history for chart
        history.value = data.map((d) => ({
          created_at: d.created_at,
          overall_score: d.overall_score,
        }))
      }
    } catch (err: any) {
      console.error('Error loading health history:', err)
      error.value = err.message || 'Failed to load health history'
    } finally {
      loading.value = false
    }
  }

  // Refresh health by calling Edge Function
  const refreshHealth = async (dateRange?: { startDate: string; endDate: string }) => {
    if (!resolvedId.value) {
      throw new Error('Site ID is required')
    }

    const functionsBaseUrl = config.public.supabaseFunctionsUrl
    if (!functionsBaseUrl) {
      throw new Error('Supabase Functions URL not configured')
    }

    loading.value = true
    error.value = null

    try {
      const payload: any = {
        site_id: resolvedId.value,
      }

      if (dateRange) {
        payload.date_range = dateRange
      }

      const response = await fetch(`${functionsBaseUrl}/ga4-health`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to refresh health score')
      }

      const data = await response.json()
      const snapshot = data.snapshot as HealthSnapshot

      // Update current
      current.value = snapshot

      // Prepend to history
      history.value.unshift({
        created_at: snapshot.created_at,
        overall_score: snapshot.overall_score,
      })

      // Keep history limited to 20 items
      if (history.value.length > 20) {
        history.value = history.value.slice(0, 20)
      }
    } catch (err: any) {
      console.error('Error refreshing health:', err)
      error.value = err.message || 'Failed to refresh health score'
      throw err
    } finally {
      loading.value = false
    }
  }

  const latestScore = computed(() => current.value?.overall_score ?? null)

  return {
    current,
    history,
    loading,
    error,
    latestScore,
    loadHistory,
    refreshHealth,
  }
}

